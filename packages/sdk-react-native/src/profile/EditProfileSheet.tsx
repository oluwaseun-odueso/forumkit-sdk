import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import {
  updateMyProfile, SOCIAL_PLATFORMS, socialToSuffix, socialToUrl, socialPlaceholder, socialPrefix,
  type SocialPlatform,
} from '@forumkit/shared';
import type { UserProfile } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { CloseIcon, SunIcon, MoonIcon } from '../components/icons';

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
  const [name, setName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [links, setLinks] = useState<DraftLink[]>(
    profile.socialLinks.map(l => ({ id: nextId++, platform: l.platform as SocialPlatform, suffix: socialToSuffix(l.platform as SocialPlatform, l.url) })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cyclePlatform(id: number) {
    setLinks(prev => prev.map(l => {
      if (l.id !== id) return l;
      const i = SOCIAL_PLATFORMS.indexOf(l.platform);
      return { ...l, platform: SOCIAL_PLATFORMS[(i + 1) % SOCIAL_PLATFORMS.length]! };
    }));
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
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: tokens.elev, borderColor: tokens.border }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: tokens.text }]}>Edit profile</Text>
            <Pressable onPress={onClose} hitSlop={8}><CloseIcon size={18} color={tokens.text} /></Pressable>
          </View>

          <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: tokens['text-2'] }]}>Display name</Text>
            <TextInput value={name} onChangeText={setName} style={[styles.input, { color: tokens.text, backgroundColor: tokens['surface-2'], borderColor: tokens['border-strong'] }]} />

            <Text style={[styles.label, { color: tokens['text-2'] }]}>Bio</Text>
            <TextInput value={bio} onChangeText={setBio} multiline style={[styles.input, { color: tokens.text, backgroundColor: tokens['surface-2'], borderColor: tokens['border-strong'], minHeight: 70, textAlignVertical: 'top' }]} />

            <Text style={[styles.label, { color: tokens['text-2'] }]}>Links</Text>
            {links.map(link => (
              <View key={link.id} style={styles.linkRow}>
                <Pressable onPress={() => cyclePlatform(link.id)} style={[styles.platBtn, { backgroundColor: tokens['surface-2'] }]}>
                  <Text style={{ color: tokens.text, fontSize: 12, fontWeight: '600' }}>{link.platform}</Text>
                </Pressable>
                <TextInput
                  value={link.suffix}
                  onChangeText={v => setLinks(prev => prev.map(l => (l.id === link.id ? { ...l, suffix: v } : l)))}
                  placeholder={socialPlaceholder(link.platform)}
                  placeholderTextColor={tokens.muted}
                  autoCapitalize="none"
                  style={[styles.linkInput, { color: tokens.text, backgroundColor: tokens['surface-2'], borderColor: tokens['border-strong'] }]}
                />
                <Pressable onPress={() => setLinks(prev => prev.filter(l => l.id !== link.id))} hitSlop={6}>
                  <CloseIcon size={16} color={tokens.muted} />
                </Pressable>
              </View>
            ))}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 12.5, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  platBtn: { borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, minWidth: 80, alignItems: 'center' },
  linkInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  addLink: { paddingVertical: 6 },
  themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, marginTop: 8, borderTopWidth: 1 },
  saveBtn: { borderRadius: 999, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
});
