import { useState, type ComponentType } from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import {
  GlobeIcon, GitHubIcon, LinkedInIcon, TwitterXIcon, BehanceIcon, DribbbleIcon, LinkIcon, ChevronRightIcon, type IconProps,
} from '../components/icons';
import AllSocialLinksSheet from './AllSocialLinksSheet';

// Exported so EditProfileSheet's platform picker can reuse the same
// platform→icon mapping instead of redefining it.
export const SOCIAL_PLATFORM_ICON: Record<string, ComponentType<IconProps>> = {
  Website: GlobeIcon,
  Portfolio: GlobeIcon,
  GitHub: GitHubIcon,
  LinkedIn: LinkedInIcon,
  'Twitter/X': TwitterXIcon,
  Behance: BehanceIcon,
  Dribbble: DribbbleIcon,
  Other: LinkIcon,
};

// A profile with many links wraps across several lines and looks messy —
// cap what shows inline, with a trailing "View all" pill opening a sheet
// that lists every link.
const MAX_INLINE = 4;

// Social/professional links display — mirrors the web profile's links row,
// using the same platform set (shared PLATFORM data) with platform icons.
export default function SocialLinks({ links, onEditProfile }: {
  links: Array<{ platform: string; url: string }>;
  onEditProfile: () => void;
}) {
  const { tokens } = useTheme();
  const [viewAllOpen, setViewAllOpen] = useState(false);
  if (links.length === 0) return null;
  const inline = links.slice(0, MAX_INLINE);
  const hasMore = links.length > MAX_INLINE;

  return (
    <>
      <View style={styles.row}>
        {inline.map((l, i) => {
          const Icon = SOCIAL_PLATFORM_ICON[l.platform] ?? LinkIcon;
          return (
            <Pressable key={`${l.platform}-${i}`} onPress={() => void Linking.openURL(l.url)} style={[styles.pill, { backgroundColor: tokens['surface-2'] }]}>
              <Icon size={15} color={tokens['text-2']} />
              <Text style={{ color: tokens['text-2'], fontSize: 12.5 }}>{l.platform}</Text>
            </Pressable>
          );
        })}
        {hasMore && (
          <Pressable onPress={() => setViewAllOpen(true)} style={[styles.pill, { backgroundColor: tokens['surface-2'] }]}>
            <Text style={{ color: tokens['text-2'], fontSize: 12.5 }}>View all</Text>
            <ChevronRightIcon size={13} color={tokens['text-2']} />
          </Pressable>
        )}
      </View>

      {viewAllOpen && (
        <AllSocialLinksSheet
          links={links}
          onClose={() => setViewAllOpen(false)}
          onEditProfile={() => { setViewAllOpen(false); onEditProfile(); }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
});
