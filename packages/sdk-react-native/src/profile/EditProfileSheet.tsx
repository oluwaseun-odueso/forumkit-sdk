import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  updateMyProfile, SOCIAL_PLATFORMS, socialToSuffix, socialToUrl, socialPlaceholder, socialPrefix,
  type SocialPlatform,
} from '@forumkit/shared';
import type { UserProfile } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { CloseIcon, SunIcon, MoonIcon, ChevronDownIcon, LinkIcon } from '../components/icons';
import { SOCIAL_PLATFORM_ICON } from './SocialLinks';

type DraftLink = { id: number; platform: SocialPlatform; suffix: string };
let nextId = 0;

// Edit Profile (bottom sheet) — mirrors sdk-web's edit-profile-modal
// (displayName, bio, social links, theme). Avatar/banner are edited from the
// profile header's camera buttons. Uses the shared social helpers.
export default function EditProfileSheet({ apiUrl, forumId, token, profile, onClose, onSaved }: {
  apiUrl: string;
  forumId: string;
  token: string | undefined;
  profile: UserProfile;
  onClose: () => void;
  onSaved: (p: UserProfile) => void;
}) {
  const { tokens, mode, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // Hard ceiling so the sheet can never reach the very top of the screen —
  // previously unbounded (only the inner ScrollView had a fixed 360pt cap,
  // regardless of screen size), which crowded the status bar on shorter
  // phones and especially with the keyboard open. Leaves a generous, fixed
  // gap from the top rather than a tight one.
  const sheetMaxHeight = windowHeight - insets.top - 100;
  const scrollMaxHeight = Math.min(300, windowHeight * 0.34);
  const [name, setName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [links, setLinks] = useState<DraftLink[]>(
    profile.socialLinks.map(l => ({ id: nextId++, platform: l.platform as SocialPlatform, suffix: socialToSuffix(l.platform as SocialPlatform, l.url) })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which link's platform picker is open — at most one at a time, mirrors
  // sdk-web's edit-profile-modal openPickerId. Rendered inline (pushing the
  // rest of the row down) rather than as an absolutely-positioned dropdown
  // like web: an absolute overlay inside this sheet's ScrollView would get
  // clipped by the scroll viewport for rows near the bottom (see the GIF
  // panel in composer/RichComposer.tsx for the same inline-panel pattern).
  const [openPickerId, setOpenPickerId] = useState<number | null>(null);

  function selectPlatform(id: number, platform: SocialPlatform) {
    setLinks(prev => prev.map(l => (l.id === id ? { ...l, platform, suffix: '' } : l)));
    setOpenPickerId(null);
  }

  async function save() {
    if (!token || saving) return;
    setSaving(true);
    setError(null);
    try {
      const socialLinks = links
        .filter(l => l.suffix.trim())
        .map(l => ({ platform: l.platform, url: socialToUrl(l.platform, l.suffix) }));
      const updated = await updateMyProfile(apiUrl, forumId, { displayName: name.trim(), bio: bio.trim() || null, socialLinks }, token);
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: tokens.elev, borderColor: tokens.border, maxHeight: sheetMaxHeight }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: tokens.text }]}>Edit profile</Text>
            <Pressable onPress={onClose} hitSlop={8}><CloseIcon size={18} color={tokens.text} /></Pressable>
          </View>

          <ScrollView style={{ maxHeight: scrollMaxHeight }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: tokens['text-2'] }]}>Display name</Text>
            <TextInput value={name} onChangeText={setName} style={[styles.input, { color: tokens.text, borderColor: tokens['border-strong'] }]} />

            <Text style={[styles.label, { color: tokens['text-2'] }]}>Bio</Text>
            <TextInput value={bio} onChangeText={setBio} multiline style={[styles.input, { color: tokens.text, borderColor: tokens['border-strong'], minHeight: 70, textAlignVertical: 'top' }]} />

            <Text style={[styles.label, { color: tokens['text-2'] }]}>Links</Text>
            {links.map(link => {
              const PlatformIcon = SOCIAL_PLATFORM_ICON[link.platform] ?? LinkIcon;
              const prefix = socialPrefix(link.platform).replace('https://', '');
              return (
                <View key={link.id} style={{ marginBottom: 8 }}>
                  <View style={styles.linkRow}>
                    <Pressable
                      onPress={() => setOpenPickerId(id => (id === link.id ? null : link.id))}
                      style={[styles.platBtn, { backgroundColor: tokens['surface-2'] }]}
                    >
                      <PlatformIcon size={17} color={tokens.text} />
                      <ChevronDownIcon size={11} color={tokens.muted} />
                    </Pressable>
                    <View style={[styles.linkUrlWrap, { borderColor: tokens['border-strong'] }]}>
                      {prefix.length > 0 && <Text style={{ color: tokens.muted, fontSize: 12.5 }}>{prefix}</Text>}
                      <TextInput
                        value={link.suffix}
                        onChangeText={v => setLinks(prev => prev.map(l => (l.id === link.id ? { ...l, suffix: v } : l)))}
                        placeholder={socialPlaceholder(link.platform)}
                        placeholderTextColor={tokens.muted}
                        autoCapitalize="none"
                        style={{ flex: 1, color: tokens.text, fontSize: 13, padding: 0 }}
                      />
                    </View>
                    <Pressable onPress={() => setLinks(prev => prev.filter(l => l.id !== link.id))} hitSlop={6}>
                      <CloseIcon size={16} color={tokens.muted} />
                    </Pressable>
                  </View>

                  {openPickerId === link.id && (
                    <View style={[styles.platformGrid, { backgroundColor: tokens['surface-2'], borderColor: tokens['border-strong'] }]}>
                      {SOCIAL_PLATFORMS.map(p => {
                        const OptIcon = SOCIAL_PLATFORM_ICON[p] ?? LinkIcon;
                        return (
                          <Pressable
                            key={p}
                            onPress={() => selectPlatform(link.id, p)}
                            style={[styles.platformOption, link.platform === p && { backgroundColor: tokens['hover-2'] }]}
                          >
                            <OptIcon size={18} color={tokens.text} />
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
            <Pressable onPress={() => setLinks(prev => [...prev, { id: nextId++, platform: 'Website', suffix: '' }])} style={styles.addLink}>
              <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: '600' }}>+ Add link</Text>
            </Pressable>

            <Pressable onPress={toggleTheme} style={[styles.themeRow, { borderColor: tokens.border }]}>
              <Text style={{ color: tokens.text, fontSize: 14 }}>Display mode</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {mode === 'dark' ? <MoonIcon size={16} color={tokens['text-2']} /> : <SunIcon size={16} color={tokens['text-2']} />}
                <Text style={{ color: tokens['text-2'], fontSize: 13 }}>{mode === 'dark' ? 'Dark' : 'Light'}</Text>
              </View>
            </Pressable>

            {error && <Text style={{ color: tokens.up, fontSize: 13, marginTop: 8 }}>{error}</Text>}
          </ScrollView>

          <Pressable onPress={save} disabled={saving} style={[styles.saveBtn, { backgroundColor: tokens.accent, opacity: saving ? 0.5 : 1 }]}>
            <Text style={{ color: tokens['accent-fg'], fontWeight: '700', fontSize: 14 }}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 12.5, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  platBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 9 },
  linkUrlWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, borderWidth: 1, borderRadius: 10, padding: 6, marginTop: 6 },
  platformOption: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addLink: { paddingVertical: 6 },
  themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, marginTop: 8, borderTopWidth: 1 },
  saveBtn: { borderRadius: 999, paddingVertical: 10, alignItems: 'center', marginTop: 14 },
});
