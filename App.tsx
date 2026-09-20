import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { models, useLLMChatSession } from 'react-native-executorch';
import { KNOWLEDGE, retrieveLocalKnowledge } from './src/knowledge';

type Role = 'user' | 'assistant';
type Message = { id: string; role: Role; content: string };
type Chat = { id: string; title: string; messages: Message[]; updatedAt: number };
type Screen = 'chat' | 'library';

const STORAGE_KEY = 'cache-native-chats-v1';
const ACTIVE_KEY = 'cache-native-active-v1';
const BLACK = '#000000';
const PANEL = '#101010';
const PANEL_2 = '#171717';
const LINE = '#2A2A2A';
const TEXT = '#F5F5F5';
const MUTED = '#8A8A8A';

const SYSTEM_PROMPT = `You are CACHE, a private on-device conversational assistant built for offline use.
Talk naturally and directly. You can chat about ordinary topics as well as survival situations.
Remember details from the conversation and answer follow-up questions using them.
When local reference notes are attached to a user message, use them when relevant but do not mention the notes unless the user asks for sources.
You have no live internet access, so never pretend you checked current websites or current news.
For emergencies, prioritize immediate safety. For serious medical symptoms, recommend professional emergency help when available.
Do not provide instructions for manufacturing, culturing, purifying, or dosing homemade prescription drugs, antibiotics, sterile injectables, poisons, or other dangerous medical preparations.
Keep answers concise by default, but give more detail when the user asks.`;

const SUGGESTIONS = [
  { icon: 'medkit-outline' as const, text: 'Emergency first aid guidance' },
  { icon: 'water-outline' as const, text: 'Purify water safely' },
  { icon: 'thermometer-outline' as const, text: 'Stay warm with limited supplies' },
];

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newChat(): Chat {
  return { id: id(), title: 'New chat', messages: [], updatedAt: Date.now() };
}

function AppRoot() {
  const [loaded, setLoaded] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [rawChats, rawActive] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_KEY),
        ]);
        let stored: Chat[] = rawChats ? JSON.parse(rawChats) : [];
        let active = rawActive || stored[0]?.id;
        if (!active || !stored.some((c) => c.id === active)) {
          const fresh = newChat();
          stored = [fresh, ...stored];
          active = fresh.id;
        }
        setChats(stored);
        setActiveId(active);
      } catch {
        const fresh = newChat();
        setChats([fresh]);
        setActiveId(fresh.id);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.multiSet([
      [STORAGE_KEY, JSON.stringify(chats.slice(0, 30))],
      [ACTIVE_KEY, activeId],
    ]).catch(() => {});
  }, [chats, activeId, loaded]);

  const activeChat = chats.find((c) => c.id === activeId) || chats[0];

  const updateActive = (messages: Message[]) => {
    setChats((current) =>
      current.map((chat) =>
        chat.id === activeId
          ? {
              ...chat,
              messages,
              title: messages.find((m) => m.role === 'user')?.content.slice(0, 38) || 'New chat',
              updatedAt: Date.now(),
            }
          : chat,
      ),
    );
  };

  const createChat = () => {
    const fresh = newChat();
    setChats((current) => [fresh, ...current].slice(0, 30));
    setActiveId(fresh.id);
    setSessionKey((k) => k + 1);
  };

  const openChat = (chatId: string) => {
    setActiveId(chatId);
    setSessionKey((k) => k + 1);
  };

  const deleteChat = (chatId: string) => {
    setChats((current) => {
      const next = current.filter((c) => c.id !== chatId);
      if (chatId === activeId) {
        const replacement = next[0] || newChat();
        if (!next.length) next.push(replacement);
        setActiveId(replacement.id);
        setSessionKey((k) => k + 1);
      }
      return next;
    });
  };

  if (!loaded || !activeChat) return <LaunchOnly />;

  return (
    <CacheApp
      key={`${activeId}-${sessionKey}`}
      chat={activeChat}
      chats={chats}
      onMessages={updateActive}
      onNewChat={createChat}
      onOpenChat={openChat}
      onDeleteChat={deleteChat}
    />
  );
}

function LaunchOnly() {
  return (
    <View style={styles.splashBase}>
      <Image source={require('./assets/cache-mark.png')} style={styles.splashLogo} resizeMode="contain" />
    </View>
  );
}

function CacheApp({
  chat,
  chats,
  onMessages,
  onNewChat,
  onOpenChat,
  onDeleteChat,
}: {
  chat: Chat;
  chats: Chat[];
  onMessages: (messages: Message[]) => void;
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('chat');
  const [messages, setMessages] = useState<Message[]>(chat.messages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashScale = useRef(new Animated.Value(0.92)).current;
  const drawerX = useRef(new Animated.Value(-340)).current;
  const listRef = useRef<FlatList<Message>>(null);

  const initialMessages = useMemo(
    () => [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...chat.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    // Intentionally frozen for this mounted chat session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chat.id],
  );

  const session = useLLMChatSession(models.llm.LFM2_5_1_2B.DEFAULT, {
    initialMessages,
    generationConfig: {
      temperature: 0.58,
      topP: 0.9,
      maxNewTokens: 320,
    },
  });

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(splashOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(splashScale, { toValue: 1, damping: 11, stiffness: 125, mass: 0.7, useNativeDriver: true }),
      ]),
      Animated.delay(520),
      Animated.timing(splashOpacity, { toValue: 0, duration: 330, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => setSplashDone(true));
  }, [splashOpacity, splashScale]);

  useEffect(() => {
    Animated.spring(drawerX, {
      toValue: drawerOpen ? 0 : -340,
      damping: 20,
      stiffness: 190,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, drawerX]);

  useEffect(() => {
    onMessages(messages);
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 40);
  }, [messages]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    if (!session.isReady || !session.sendMessage) return;

    setInput('');
    setBusy(true);
    setStreaming('');
    const userMessage: Message = { id: id(), role: 'user', content: text };
    setMessages((current) => [...current, userMessage]);

    const refs = retrieveLocalKnowledge(text);
    const context = refs.length
      ? `\n\n[Local CACHE reference notes. Use only if relevant, and do not mention this block unless asked for sources.]\n${refs
          .map((r, index) => `${index + 1}. ${r.title}: ${r.text}`)
          .join('\n')}`
      : '';

    try {
      let streamed = '';
      const result = await session.sendMessage(`${text}${context}`, (token) => {
        streamed += token;
        setStreaming(streamed);
      });
      const assistantFromResult = [...result.messages]
        .reverse()
        .find((m) => m.role === 'assistant')?.content;
      const answer = (assistantFromResult || streamed || 'I could not generate a response.').trim();
      setStreaming('');
      setMessages((current) => [...current, { id: id(), role: 'assistant', content: answer }]);
    } catch (error) {
      setStreaming('');
      setMessages((current) => [
        ...current,
        {
          id: id(),
          role: 'assistant',
          content: error instanceof Error ? `CACHE could not reply: ${error.message}` : 'CACHE could not reply right now.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const stop = () => {
    try {
      session.stop?.();
    } catch {}
    setBusy(false);
  };

  const modelStatus = !session.isReady
    ? session.error
      ? 'CACHE AI setup needs a connection. Tap to retry after reconnecting.'
      : `Preparing CACHE AI ${Math.round(session.downloadProgress || 0)}%`
    : '';

  const isHome = screen === 'chat' && messages.length === 0;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TopBar
          top={insets.top}
          screen={screen}
          setScreen={setScreen}
          onMenu={() => setDrawerOpen(true)}
          onNew={onNewChat}
        />

        {screen === 'chat' ? (
          <View style={styles.flex}>
            {isHome ? (
              <HomeSuggestions onPick={send} />
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <MessageRow message={item} />}
                contentContainerStyle={[styles.messageList, { paddingBottom: 20 }]}
                keyboardDismissMode="interactive"
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                ListFooterComponent={
                  streaming ? <MessageRow message={{ id: 'stream', role: 'assistant', content: streaming }} streaming /> : busy ? <TypingDots /> : null
                }
              />
            )}

            <Composer
              bottom={insets.bottom}
              value={input}
              onChange={setInput}
              onSend={() => send(input)}
              onStop={stop}
              busy={busy}
              ready={session.isReady}
              home={isHome}
              status={modelStatus}
              onPlus={() => setActionsOpen(true)}
              onLibrary={() => setScreen('library')}
            />
          </View>
        ) : (
          <Library bottom={insets.bottom} onBack={() => setScreen('chat')} onAsk={(text) => { setScreen('chat'); setTimeout(() => send(text), 100); }} />
        )}
      </KeyboardAvoidingView>

      <Drawer
        top={insets.top}
        bottom={insets.bottom}
        translateX={drawerX}
        open={drawerOpen}
        chats={chats}
        activeId={chat.id}
        onClose={() => setDrawerOpen(false)}
        onNew={() => { setDrawerOpen(false); onNewChat(); }}
        onOpen={(id) => { setDrawerOpen(false); onOpenChat(id); }}
        onDelete={onDeleteChat}
      />

      <ActionSheet
        open={actionsOpen}
        bottom={insets.bottom}
        onClose={() => setActionsOpen(false)}
        onNew={() => { setActionsOpen(false); onNewChat(); }}
        onLibrary={() => { setActionsOpen(false); setScreen('library'); }}
      />

      {!splashDone && (
        <Animated.View style={[styles.splash, { opacity: splashOpacity }]} pointerEvents="none">
          <Animated.Image
            source={require('./assets/cache-mark.png')}
            style={[styles.splashLogo, { transform: [{ scale: splashScale }] }]}
            resizeMode="contain"
          />
        </Animated.View>
      )}
    </View>
  );
}

function TopBar({ top, screen, setScreen, onMenu, onNew }: { top: number; screen: Screen; setScreen: (s: Screen) => void; onMenu: () => void; onNew: () => void }) {
  return (
    <View style={[styles.topBar, { paddingTop: top + 8 }]}>
      <RoundButton icon="menu" onPress={onMenu} />
      <View style={styles.segment}>
        <Pressable style={[styles.segmentButton, screen === 'chat' && styles.segmentActive]} onPress={() => setScreen('chat')}>
          <Text style={styles.segmentText}>Chat</Text>
        </Pressable>
        <Pressable style={[styles.segmentButton, screen === 'library' && styles.segmentActive]} onPress={() => setScreen('library')}>
          <Text style={styles.segmentText}>Library</Text>
        </Pressable>
      </View>
      <RoundButton icon="add" onPress={onNew} />
    </View>
  );
}

function RoundButton({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 30, bounciness: 3 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 5 }).start()}
    >
      <Animated.View style={[styles.roundButton, { transform: [{ scale }] }]}>
        <Ionicons name={icon} size={24} color={TEXT} />
      </Animated.View>
    </Pressable>
  );
}

function HomeSuggestions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <View style={styles.homeSuggestionsWrap}>
      {SUGGESTIONS.map((item, index) => (
        <AnimatedSuggestion key={item.text} item={item} delay={index * 70} onPress={() => onPick(item.text)} />
      ))}
    </View>
  );
}

function AnimatedSuggestion({ item, delay, onPress }: { item: (typeof SUGGESTIONS)[number]; delay: number; onPress: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, y]);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>
      <Pressable style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]} onPress={onPress}>
        <Ionicons name={item.icon} size={23} color="#E5E5E5" />
        <Text style={styles.suggestionText}>{item.text}</Text>
      </Pressable>
    </Animated.View>
  );
}

function MessageRow({ message, streaming = false }: { message: Message; streaming?: boolean }) {
  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.messageText}>{message.content}</Text>
        </View>
        <View style={styles.userAvatar}>
          <Ionicons name="person" size={17} color="#9A9A9A" />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.assistantRow}>
      <Image source={require('./assets/cache-mark.png')} style={styles.assistantLogo} resizeMode="contain" />
      <View style={styles.assistantBubble}>
        <Text style={styles.messageText}>{message.content}{streaming ? '▍' : ''}</Text>
      </View>
    </View>
  );
}

function TypingDots() {
  const a = useRef(new Animated.Value(0.25)).current;
  const b = useRef(new Animated.Value(0.25)).current;
  const c = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const pulse = (v: Animated.Value, delay: number) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.25, duration: 260, useNativeDriver: true }),
      Animated.delay(520 - delay),
    ]));
    const loops = [pulse(a, 0), pulse(b, 120), pulse(c, 240)];
    loops.forEach((x) => x.start());
    return () => loops.forEach((x) => x.stop());
  }, [a, b, c]);
  return (
    <View style={styles.typingRow}>
      <Image source={require('./assets/cache-mark.png')} style={styles.assistantLogo} resizeMode="contain" />
      <View style={styles.dots}>
        {[a, b, c].map((v, i) => <Animated.View key={i} style={[styles.dot, { opacity: v }]} />)}
      </View>
    </View>
  );
}

function Composer({ bottom, value, onChange, onSend, onStop, busy, ready, home, status, onPlus, onLibrary }: {
  bottom: number;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  ready: boolean;
  home: boolean;
  status: string;
  onPlus: () => void;
  onLibrary: () => void;
}) {
  return (
    <View style={[styles.composerArea, { paddingBottom: Math.max(10, bottom) }]}>
      {!!status && <Text style={styles.setupText}>{status}</Text>}
      <View style={[styles.composer, home && styles.composerHome]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Ask CACHE"
          placeholderTextColor="#666"
          multiline
          maxLength={4000}
          style={[styles.input, home && styles.inputHome]}
        />
        <View style={styles.composerActions}>
          <Pressable style={({ pressed }) => [styles.composerIcon, pressed && styles.pressed]} onPress={onPlus}>
            <Ionicons name="add" size={29} color="#F0F0F0" />
          </Pressable>
          {home && (
            <Pressable style={({ pressed }) => [styles.composerIcon, pressed && styles.pressed]} onPress={onLibrary}>
              <Image source={require('./assets/cache-mark.png')} style={styles.miniCache} resizeMode="contain" />
            </Pressable>
          )}
          <View style={styles.composerSpacer} />
          <Pressable
            style={({ pressed }) => [styles.sendButton, (!value.trim() || !ready) && !busy && styles.sendDisabled, pressed && styles.pressed]}
            onPress={busy ? onStop : onSend}
            disabled={!busy && (!value.trim() || !ready)}
          >
            {busy ? <Ionicons name="stop" size={17} color="#111" /> : <Ionicons name="arrow-up" size={22} color="#111" />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Library({ bottom, onBack, onAsk }: { bottom: number; onBack: () => void; onAsk: (text: string) => void }) {
  return (
    <ScrollView contentContainerStyle={[styles.library, { paddingBottom: bottom + 30 }]}>
      <View style={styles.libraryTitleRow}>
        <Image source={require('./assets/cache-mark.png')} style={styles.libraryMark} resizeMode="contain" />
        <View>
          <Text style={styles.libraryTitle}>CACHE Library</Text>
          <Text style={styles.librarySub}>Stored guidance available without a connection.</Text>
        </View>
      </View>
      {KNOWLEDGE.map((card) => (
        <Pressable key={card.id} style={({ pressed }) => [styles.libraryCard, pressed && styles.pressed]} onPress={() => onAsk(`Tell me about ${card.title.toLowerCase()}.`)}>
          <Text style={styles.libraryCategory}>{card.category}</Text>
          <Text style={styles.libraryCardTitle}>{card.title}</Text>
          <Text style={styles.libraryCardText} numberOfLines={3}>{card.text}</Text>
        </Pressable>
      ))}
      <Pressable onPress={onBack} style={styles.backToChat}><Text style={styles.backToChatText}>Back to chat</Text></Pressable>
    </ScrollView>
  );
}

function Drawer({ top, bottom, translateX, open, chats, activeId, onClose, onNew, onOpen, onDelete }: {
  top: number; bottom: number; translateX: Animated.Value; open: boolean; chats: Chat[]; activeId: string;
  onClose: () => void; onNew: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <>
      {open && <Pressable style={styles.scrim} onPress={onClose} />}
      <Animated.View style={[styles.drawer, { paddingTop: top + 14, paddingBottom: bottom + 14, transform: [{ translateX }] }]}>
        <View style={styles.drawerHead}>
          <View style={styles.drawerBrand}><Image source={require('./assets/cache-mark.png')} style={styles.drawerLogo} resizeMode="contain" /><Text style={styles.drawerBrandText}>CACHE</Text></View>
          <Pressable onPress={onClose} style={styles.drawerClose}><Ionicons name="close" size={25} color={TEXT} /></Pressable>
        </View>
        <Pressable style={({ pressed }) => [styles.newChatButton, pressed && styles.pressed]} onPress={onNew}>
          <Ionicons name="create-outline" size={20} color={TEXT} /><Text style={styles.newChatText}>New chat</Text>
        </Pressable>
        <Text style={styles.recent}>Recent</Text>
        <ScrollView>
          {chats.slice().sort((a, b) => b.updatedAt - a.updatedAt).map((chat) => (
            <Pressable key={chat.id} onPress={() => onOpen(chat.id)} onLongPress={() => onDelete(chat.id)} style={({ pressed }) => [styles.chatHistory, chat.id === activeId && styles.chatHistoryActive, pressed && styles.pressed]}>
              <Text style={styles.chatHistoryText} numberOfLines={1}>{chat.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.drawerHint}>Hold a chat to delete it.</Text>
      </Animated.View>
    </>
  );
}

function ActionSheet({ open, bottom, onClose, onNew, onLibrary }: { open: boolean; bottom: number; onClose: () => void; onNew: () => void; onLibrary: () => void }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetScrim} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: bottom + 16 }]} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Pressable style={styles.sheetAction} onPress={onNew}><Ionicons name="create-outline" size={21} color={TEXT} /><Text style={styles.sheetActionText}>New chat</Text></Pressable>
          <Pressable style={styles.sheetAction} onPress={onLibrary}><Ionicons name="albums-outline" size={21} color={TEXT} /><Text style={styles.sheetActionText}>Open library</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function App() {
  return <SafeAreaProvider><AppRoot /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: BLACK },
  splashBase: { flex: 1, backgroundColor: BLACK, alignItems: 'center', justifyContent: 'center' },
  splash: { ...StyleSheet.absoluteFillObject, backgroundColor: BLACK, zIndex: 999, alignItems: 'center', justifyContent: 'center' },
  splashLogo: { width: 92, height: 92 },

  topBar: { minHeight: 84, paddingHorizontal: 18, paddingBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: BLACK, zIndex: 10 },
  roundButton: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, alignItems: 'center', justifyContent: 'center' },
  segment: { flex: 1, height: 54, borderRadius: 28, padding: 5, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, flexDirection: 'row' },
  segmentButton: { flex: 1, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: '#3A3A3A' },
  segmentText: { color: TEXT, fontSize: 17, fontWeight: '500' },

  homeSuggestionsWrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 34, paddingBottom: 202, gap: 6 },
  suggestion: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 19, paddingHorizontal: 12, borderRadius: 18 },
  suggestionText: { color: '#E3E3E3', fontSize: 17, letterSpacing: -0.25 },
  pressed: { opacity: 0.66, transform: [{ scale: 0.985 }] },

  messageList: { paddingTop: 28, paddingHorizontal: 18 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 9, marginVertical: 13 },
  userBubble: { maxWidth: '78%', backgroundColor: '#141414', borderWidth: 1, borderColor: '#303030', borderRadius: 20, borderBottomRightRadius: 7, paddingHorizontal: 15, paddingVertical: 12 },
  userAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL_2, alignItems: 'center', justifyContent: 'center' },
  assistantRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginVertical: 13 },
  assistantLogo: { width: 34, height: 34, marginTop: 6 },
  assistantBubble: { maxWidth: '82%', backgroundColor: '#121212', borderWidth: 1, borderColor: '#303030', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 13 },
  messageText: { color: '#F0F0F0', fontSize: 15, lineHeight: 22 },
  typingRow: { flexDirection: 'row', gap: 11, alignItems: 'center', marginVertical: 13 },
  dots: { height: 34, flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E0E0E0' },

  composerArea: { backgroundColor: BLACK, paddingHorizontal: 14, paddingTop: 8 },
  setupText: { color: '#666', fontSize: 10.5, textAlign: 'center', marginBottom: 6 },
  composer: { minHeight: 55, maxHeight: 150, borderWidth: 1, borderColor: '#323232', backgroundColor: '#0B0B0B', borderRadius: 29, paddingHorizontal: 12, paddingTop: 5, paddingBottom: 7 },
  composerHome: { minHeight: 124, borderRadius: 30, paddingTop: 12 },
  input: { color: TEXT, fontSize: 15, lineHeight: 21, maxHeight: 80, paddingHorizontal: 4, paddingVertical: 7 },
  inputHome: { fontSize: 20, lineHeight: 27, minHeight: 48 },
  composerActions: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 4 },
  composerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  miniCache: { width: 29, height: 29 },
  composerSpacer: { flex: 1 },
  sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEFEF' },
  sendDisabled: { backgroundColor: '#5A5A5A' },

  library: { paddingHorizontal: 17, paddingTop: 22 },
  libraryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  libraryMark: { width: 40, height: 40 },
  libraryTitle: { color: TEXT, fontWeight: '700', fontSize: 19 },
  librarySub: { color: MUTED, fontSize: 11.5, marginTop: 2, maxWidth: 280 },
  libraryCard: { borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, borderRadius: 18, padding: 16, marginBottom: 10 },
  libraryCategory: { color: '#707070', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700' },
  libraryCardTitle: { color: TEXT, fontSize: 16, fontWeight: '600', marginTop: 6 },
  libraryCardText: { color: '#A0A0A0', fontSize: 13, lineHeight: 19, marginTop: 7 },
  backToChat: { height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  backToChatText: { color: '#AFAFAF', fontSize: 14 },

  scrim: { ...StyleSheet.absoluteFillObject, zIndex: 70, backgroundColor: 'rgba(0,0,0,0.66)' },
  drawer: { position: 'absolute', zIndex: 80, top: 0, bottom: 0, left: 0, width: 315, backgroundColor: '#090909', borderRightWidth: 1, borderRightColor: '#202020', paddingHorizontal: 14 },
  drawerHead: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  drawerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerLogo: { width: 31, height: 31 },
  drawerBrandText: { color: TEXT, fontSize: 13, fontWeight: '700', letterSpacing: 1.7 },
  drawerClose: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  newChatButton: { height: 48, borderRadius: 15, backgroundColor: '#111', borderWidth: 1, borderColor: LINE, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  newChatText: { color: TEXT, fontSize: 14, fontWeight: '500' },
  recent: { color: '#5F5F5F', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 22, marginBottom: 9, marginHorizontal: 5 },
  chatHistory: { height: 42, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 11, marginBottom: 2 },
  chatHistoryActive: { backgroundColor: '#151515' },
  chatHistoryText: { color: '#D0D0D0', fontSize: 13 },
  drawerHint: { color: '#444', fontSize: 10, marginHorizontal: 5, marginTop: 8 },

  sheetScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0E0E0E', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#252525', paddingTop: 9, paddingHorizontal: 16 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#3C3C3C', alignSelf: 'center', marginBottom: 13 },
  sheetAction: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#222' },
  sheetActionText: { color: TEXT, fontSize: 15 },
});
