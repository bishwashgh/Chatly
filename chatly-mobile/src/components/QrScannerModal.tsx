import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { Check, X } from 'lucide-react-native';
import { colors, radii, spacing } from '../lib/theme';

type Props = { visible: boolean; onClose: () => void; onScanned: (value: string) => void };

export function QrScannerModal({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => { if (visible) { setScanned(false); requestPermission(); } }, [visible, requestPermission]);

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
  };

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.root}>
      {permission?.granted ? <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onBarcodeScanned} /> : <View style={styles.permission}><Text style={styles.permissionTitle}>Camera access needed</Text><Text style={styles.permissionText}>Allow camera access to scan a Chatly friend QR code.</Text><Pressable style={styles.button} onPress={() => permission?.canAskAgain ? requestPermission() : Linking.openSettings()}><Text style={styles.buttonText}>{permission?.canAskAgain ? 'Allow camera' : 'Open settings'}</Text></Pressable></View>}
      <BlurView intensity={35} tint="dark" style={styles.top}><Pressable style={styles.close} onPress={onClose}><X size={21} color="#fff" /></Pressable><Text style={styles.title}>Scan QR code</Text><View style={styles.spacer} /></BlurView>
      {permission?.granted && <View style={styles.frame}><View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} /><View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} />{scanned && <View style={styles.success}><Check size={28} color="#fff" /></View>}</View>}
      <Text style={styles.help}>Point the camera at a friend's Chatly QR code</Text>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }, top: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 58, paddingBottom: 15, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center' }, title: { color: '#fff', fontSize: 18, fontWeight: '800' }, spacer: { width: 40 }, frame: { width: 250, height: 250, position: 'relative' }, corner: { width: 34, height: 34, position: 'absolute', borderColor: '#fff' }, tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }, tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }, bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }, br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 }, success: { position: 'absolute', alignSelf: 'center', top: 100, left: 100, width: 50, height: 50, borderRadius: 25, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }, help: { position: 'absolute', bottom: 80, color: 'rgba(255,255,255,0.84)', textAlign: 'center', fontSize: 14 }, permission: { padding: spacing.xl, alignItems: 'center' }, permissionTitle: { color: '#fff', fontSize: 19, fontWeight: '800' }, permissionText: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 }, button: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing.xl, paddingVertical: 13 }, buttonText: { color: '#fff', fontWeight: '800' }, });
