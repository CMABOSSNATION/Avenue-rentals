// mobile/src/screens/shared/ChatScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../services/api';
import { getSocket, joinInquiry, leaveInquiry, sendTyping } from '../../services/socket';
import { useAuthStore } from '../../store';
import { formatUGX } from '../../data/ugandaLocations';
import { format, isToday, isYesterday } from 'date-fns';

const COLORS = { primary: '#1B5E20', sent: '#DCF8C6', received: '#fff' };

function formatMsgTime(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`;
  return format(d, 'dd/MM/yy HH:mm');
}

function MessageBubble({ msg, isMe }) {
  return (
    <View style={[styles.bubble, isMe ? styles.bubbleSent : styles.bubbleReceived]}>
      {msg.message_type === 'image' && msg.image_url ? (
        <FastImage style={styles.msgImage} source={{ uri: msg.image_url }} resizeMode="cover" />
      ) : (
        <Text style={[styles.msgText, isMe && styles.msgTextSent]}>{msg.content}</Text>
      )}
      <Text style={[styles.msgTime, isMe && styles.msgTimeSent]}>{formatMsgTime(msg.created_at)}</Text>
      {isMe && <Icon name={msg.is_read ? 'check-all' : 'check'} size={12} color={msg.is_read ? '#4CAF50' : '#aaa'} style={styles.readIcon} />}
    </View>
  );
}

export default function ChatScreen({ navigation, route }) {
  const { inquiryId, inquiry: inquiryProp } = route.params;
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [inquiry, setInquiry] = useState(inquiryProp || null);
  const flatListRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    loadMessages();
    const socket = getSocket();
    if (socket) {
      joinInquiry(inquiryId);
      socket.on('new_message', handleNewMessage);
      socket.on('user_typing', () => {
        setTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTyping(false), 2000);
      });
    }
    return () => {
      leaveInquiry(inquiryId);
      socket?.off('new_message', handleNewMessage);
      socket?.off('user_typing');
    };
  }, [inquiryId]);

  async function loadMessages() {
    try {
      const { data } = await api.get(`/inquiries/${inquiryId}/messages`);
      setMessages(data);
    } catch (err) {
      Alert.alert('Error', 'Could not load messages');
    } finally {
      setLoading(false);
    }
  }

  const handleNewMessage = useCallback((msg) => {
    setMessages(prev => [...prev, msg]);
    setTyping(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  function handleTyping() {
    sendTyping(inquiryId);
  }

  async function sendMessage() {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    // Optimistic update
    const tempMsg = {
      id: 'temp-' + Date.now(),
      inquiry_id: inquiryId,
      sender_id: user.id,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
      message_type: 'text',
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const { data } = await api.post(`/inquiries/${inquiryId}/messages`, { content });
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      Alert.alert('Error', 'Failed to send message');
      setText(content);
    } finally {
      setSending(false);
    }
  }

  async function sendImage() {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
    if (!result.assets?.[0]) return;
    // Upload image then send as message
    // (Implementation: upload to Supabase storage, then post message with image_url)
    Alert.alert('Feature', 'Image sharing — upload and send image URL');
  }

  async function handleMakeDeal() {
    navigation.navigate('CreateDeal', { inquiry });
  }

  const isLandlord = user?.role === 'landlord';
  const canMakeDeal = isLandlord && inquiry?.status === 'accepted';
  const otherParty = isLandlord
    ? inquiry?.tenant || { name: 'Tenant' }
    : inquiry?.landlord || { name: 'Landlord' };

  navigation.setOptions({ headerTitle: otherParty.name || 'Chat' });

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Property header bar */}
      {inquiry?.properties && (
        <View style={styles.propertyBar}>
          <Icon name="home" size={16} color={COLORS.primary} />
          <Text style={styles.propertyBarText} numberOfLines={1}>{inquiry.properties.title}</Text>
          <Text style={styles.propertyBarPrice}>{formatUGX(inquiry.properties.price)}/mo</Text>
        </View>
      )}

      {/* Status bar */}
      {inquiry?.status && inquiry.status !== 'pending' && (
        <View style={[styles.statusBar, inquiry.status === 'accepted' && styles.statusAccepted]}>
          <Text style={styles.statusText}>
            {inquiry.status === 'accepted' ? '✅ Inquiry Accepted — You can now arrange viewing' :
             inquiry.status === 'rejected' ? '❌ Inquiry not accepted' :
             inquiry.status === 'closed' ? '🔒 Conversation closed' : ''}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MessageBubble msg={item} isMe={item.sender_id === user?.id} />
        )}
        contentContainerStyle={styles.msgList}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>Send a message to start the conversation</Text>
          </View>
        }
      />

      {/* Typing indicator */}
      {typing && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>{otherParty.name} is typing...</Text>
        </View>
      )}

      {/* Make a Deal button */}
      {canMakeDeal && (
        <TouchableOpacity style={styles.dealBtn} onPress={handleMakeDeal}>
          <Icon name="handshake" size={18} color="#fff" />
          <Text style={styles.dealBtnText}>Create Rental Deal</Text>
        </TouchableOpacity>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity onPress={sendImage} style={styles.attachBtn}>
          <Icon name="image-outline" size={22} color="#888" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={t => { setText(t); handleTyping(); }}
          placeholder="Type a message..."
          placeholderTextColor="#aaa"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          <Icon name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE5DD' },
  propertyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  propertyBarText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333' },
  propertyBarPrice: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  statusBar: { backgroundColor: '#FFF3E0', paddingHorizontal: 14, paddingVertical: 8 },
  statusAccepted: { backgroundColor: '#E8F5E9' },
  statusText: { fontSize: 13, color: '#333', textAlign: 'center' },
  msgList: { padding: 12, paddingBottom: 4 },
  bubble: { maxWidth: '78%', borderRadius: 12, padding: 10, marginBottom: 6, elevation: 1 },
  bubbleSent: { alignSelf: 'flex-end', backgroundColor: COLORS.sent, borderBottomRightRadius: 2 },
  bubbleReceived: { alignSelf: 'flex-start', backgroundColor: COLORS.received, borderBottomLeftRadius: 2 },
  msgText: { fontSize: 15, color: '#1A1A1A', lineHeight: 20 },
  msgTextSent: { color: '#1A1A1A' },
  msgImage: { width: 200, height: 150, borderRadius: 8 },
  msgTime: { fontSize: 10, color: '#aaa', alignSelf: 'flex-end', marginTop: 3 },
  msgTimeSent: { color: '#999' },
  readIcon: { alignSelf: 'flex-end', marginTop: 1 },
  emptyChat: { alignItems: 'center', paddingTop: 40 },
  emptyChatText: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  typingIndicator: { paddingHorizontal: 16, paddingVertical: 4 },
  typingText: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  dealBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, margin: 10, borderRadius: 12, paddingVertical: 12 },
  dealBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: '#fff', padding: 8, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  attachBtn: { padding: 8 },
  input: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, maxHeight: 100, color: '#333' },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 22, width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#ccc' },
});
