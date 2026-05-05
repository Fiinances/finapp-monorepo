import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Pressable,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';

const MENU_WIDTH = 285;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SideMenuProps {
    visible: boolean;
    onClose: () => void;
}

export function SideMenu({ visible, onClose }: SideMenuProps) {
    const { user, signOut } = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    const translateX = useRef(new Animated.Value(-MENU_WIDTH)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 22,
                    stiffness: 220,
                    mass: 0.8,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: -MENU_WIDTH,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, translateX, backdropOpacity]);

    const handleLogout = useCallback(async () => {
        onClose();
        // Small delay so close animation plays before auth state changes
        setTimeout(() => signOut(), 250);
    }, [onClose, signOut]);

    const email = user?.email ?? '';
    const initials = email.slice(0, 2).toUpperCase();

    // Colors
    const bgMenu = isDark ? '#1a1f2e' : '#ffffff';
    const textPrimary = isDark ? '#e5e7eb' : '#1a1f2e';
    const textMuted = isDark ? '#9ca3af' : '#6b7280';
    const bgItemActive = isDark ? '#252d45' : '#f0f0ff';
    const divider = isDark ? '#2d3550' : '#e5e7eb';
    const bgLogout = isDark ? '#2d1515' : '#fef2f2';

    return (
        <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
            pointerEvents={visible ? 'auto' : 'none'}
        >
            {/* ── Backdrop ── */}
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.48)',
                    opacity: backdropOpacity,
                }}
                pointerEvents={visible ? 'auto' : 'none'}
            >
                <Pressable style={{ flex: 1 }} onPress={onClose} />
            </Animated.View>

            {/* ── Drawer panel ── */}
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: MENU_WIDTH,
                    backgroundColor: bgMenu,
                    transform: [{ translateX }],
                    paddingTop: insets.top + 12,
                    paddingBottom: insets.bottom + 16,
                    shadowColor: '#000',
                    shadowOpacity: 0.18,
                    shadowOffset: { width: 4, height: 0 },
                    shadowRadius: 20,
                    elevation: 12,
                }}
            >
                {/* Close button */}
                <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                        position: 'absolute',
                        top: insets.top + 14,
                        right: 14,
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: isDark ? '#252d45' : '#f3f4f8',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                    }}
                >
                    <Feather name="x" size={16} color={textMuted} />
                </TouchableOpacity>

                {/* ── User section ── */}
                <View
                    style={{
                        paddingHorizontal: 20,
                        paddingTop: 8,
                        paddingBottom: 20,
                        borderBottomWidth: 1,
                        borderBottomColor: divider,
                    }}
                >
                    {/* Avatar */}
                    <View
                        style={{
                            width: 54,
                            height: 54,
                            borderRadius: 27,
                            backgroundColor: '#6366f1',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 12,
                            shadowColor: '#6366f1',
                            shadowOpacity: 0.35,
                            shadowOffset: { width: 0, height: 4 },
                            shadowRadius: 8,
                            elevation: 4,
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 19, fontWeight: '700' }}>{initials}</Text>
                    </View>

                    <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 3 }}>
                        Minha Conta
                    </Text>
                    <Text style={{ color: textMuted, fontSize: 12 }} numberOfLines={1}>
                        {email}
                    </Text>
                </View>

                {/* ── Navigation links ── */}
                <View style={{ flex: 1, paddingTop: 14, paddingHorizontal: 12 }}>
                    <Text
                        style={{
                            color: textMuted,
                            fontSize: 10,
                            fontWeight: '600',
                            letterSpacing: 0.8,
                            textTransform: 'uppercase',
                            paddingHorizontal: 10,
                            marginBottom: 6,
                        }}
                    >
                        Menu
                    </Text>

                    <MenuItem
                        icon="home"
                        label="Dashboard"
                        onPress={onClose}
                        textPrimary={textPrimary}
                        bgActive={bgItemActive}
                        active
                    />
                    <MenuItem
                        icon="list"
                        label="Transações"
                        onPress={onClose}
                        textPrimary={textPrimary}
                        bgActive={bgItemActive}
                    />
                    <MenuItem
                        icon="credit-card"
                        label="Bancos e Cartões"
                        onPress={onClose}
                        textPrimary={textPrimary}
                        bgActive={bgItemActive}
                    />
                    <MenuItem
                        icon="repeat"
                        label="Parcelamentos"
                        onPress={onClose}
                        textPrimary={textPrimary}
                        bgActive={bgItemActive}
                    />
                </View>

                {/* ── Logout ── */}
                <View style={{ paddingHorizontal: 12 }}>
                    <View style={{ height: 1, backgroundColor: divider, marginBottom: 12 }} />
                    <TouchableOpacity
                        onPress={handleLogout}
                        activeOpacity={0.75}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 13,
                            paddingHorizontal: 14,
                            borderRadius: 12,
                            backgroundColor: bgLogout,
                            gap: 12,
                        }}
                    >
                        <Feather name="log-out" size={17} color="#ef4444" />
                        <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '600' }}>
                            Sair da conta
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

// ── Internal menu item ──────────────────────────────────────────────────────

interface MenuItemProps {
    icon: React.ComponentProps<typeof Feather>['name'];
    label: string;
    onPress: () => void;
    textPrimary: string;
    bgActive: string;
    active?: boolean;
}

function MenuItem({ icon, label, onPress, textPrimary, bgActive, active }: MenuItemProps) {
    const itemColor = active ? '#6366f1' : textPrimary;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: active ? bgActive : 'transparent',
                marginBottom: 2,
                gap: 12,
            }}
        >
            <Feather name={icon} size={17} color={itemColor} />
            <Text
                style={{
                    color: itemColor,
                    fontSize: 14,
                    fontWeight: active ? '600' : '400',
                }}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}
