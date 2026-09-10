import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, Phone, Video, RefreshCw } from 'lucide-react-native';
import { CALL_LOG_QUERY } from '../graphql/calls.gql';
import { CREATE_DIRECT_CONVERSATION } from '../graphql/conversations.gql';
import { Avatar } from '../components/Avatar';
import { AmbientBackground } from '../components/AmbientBackground';
import { colors, radii, shadows, spacing } from '../lib/theme';

function formatDate(value: string) { return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' }); }
function formatDuration(startedAt: string, endedAt?: string) { if (!endedAt) return ''; const seconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
export function CallLogScreen({ navigation }: any) {
  const { data, loading, error, refetch } = useQuery(CALL_LOG_QUERY);
  const [createConversation] = useMutation(CREATE_DIRECT_CONVERSATION);
  const rows = data?.callLog ?? [];
  const openPeerChat = async (peer: any) => {
    const result = await createConversation({ variables: { recipientId: peer.id } });
    const conversation = result.data?.createDirectConversation;
    if (conversation) navigation.navigate('Chat', { conversationId: conversation.id, title: peer.name, peerId: peer.id, peerAvatarUrl: peer.avatarUrl, peerIsOnline: peer.isOnline });
  };
  return <View style={styles.screen}><AmbientBackground /><View style={styles.header}><Pressable style={styles.icon} onPress={() => navigation.goBack()}><ChevronLeft size={22} color={colors.textPrimary} /></Pressable><Text style={styles.title}>Call log</Text><View style={{ width: 40 }} /></View><FlatList data={rows} keyExtractor={(item: any) => item.id} refreshing={loading} onRefresh={refetch} contentContainerStyle={styles.list} ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} /> : error ? <View style={styles.errorBox}><Text style={styles.empty}>Could not load call history.</Text><Pressable style={styles.retry} onPress={() => refetch()}><RefreshCw size={15} color="#fff" /><Text style={styles.retryText}>Try again</Text></Pressable></View> : <Text style={styles.empty}>No calls yet</Text>} renderItem={({ item }: any) => { const missed = item.status === 'MISSED' || item.status === 'DECLINED'; const outgoing = item.status !== 'MISSED' && item.status !== 'DECLINED'; const Icon = item.callType === 'VIDEO' ? Video : Phone; return <Pressable style={styles.row} onPress={() => openPeerChat(item.peer)}><Avatar uri={item.peer.avatarUrl} name={item.peer.name} size={48} isOnline={item.peer.isOnline} /><View style={styles.copy}><Text style={styles.name}>{item.peer.name}</Text><View style={styles.meta}>{outgoing ? <ArrowUpRight size={14} color={colors.success} /> : <ArrowDownLeft size={14} color={colors.danger} />}<Text style={[styles.status, missed && styles.missed]}>{missed ? 'Missed call' : outgoing ? 'Outgoing call' : 'Incoming call'}</Text></View></View><View style={styles.right}><Icon size={17} color={missed ? colors.danger : colors.primary} /><Text style={styles.date}>{formatDate(item.startedAt)}{formatDuration(item.startedAt, item.endedAt) ? ` · ${formatDuration(item.startedAt, item.endedAt)}` : ''}</Text>
</View></Pressable>; }} /></View>;
}
const styles = StyleSheet.create({ errorBox: { alignItems: 'center', gap: spacing.sm, marginTop: 80 }, retry: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing.lg, paddingVertical: 10 }, retryText: { color: '#fff', fontWeight: '700' }, screen: { flex: 1, backgroundColor: colors.bg }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: 58, paddingBottom: spacing.md }, icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm }, title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' }, list: { padding: spacing.lg, gap: spacing.sm }, row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, ...shadows.sm }, copy: { flex: 1 }, name: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' }, meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }, status: { color: colors.textSecondary, fontSize: 12 }, missed: { color: colors.danger }, right: { alignItems: 'flex-end', gap: 7 }, date: { color: colors.textMuted, fontSize: 11 }, empty: { color: colors.textMuted, textAlign: 'center', marginTop: 80 } });
