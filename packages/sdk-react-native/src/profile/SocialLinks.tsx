import { type ComponentType } from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import {
  GlobeIcon, GitHubIcon, LinkedInIcon, TwitterXIcon, BehanceIcon, DribbbleIcon, LinkIcon, type IconProps,
} from '../components/icons';

const ICON: Record<string, ComponentType<IconProps>> = {
  Website: GlobeIcon,
  Portfolio: GlobeIcon,
  GitHub: GitHubIcon,
  LinkedIn: LinkedInIcon,
  'Twitter/X': TwitterXIcon,
  Behance: BehanceIcon,
  Dribbble: DribbbleIcon,
  Other: LinkIcon,
};

// Social/professional links display — mirrors the web profile's links row,
// using the same platform set (shared PLATFORM data) with platform icons.
export default function SocialLinks({ links }: { links: Array<{ platform: string; url: string }> }) {
  const { tokens } = useTheme();
  if (links.length === 0) return null;
  return (
    <View style={styles.row}>
      {links.map((l, i) => {
        const Icon = ICON[l.platform] ?? LinkIcon;
        return (
          <Pressable key={`${l.platform}-${i}`} onPress={() => void Linking.openURL(l.url)} style={[styles.pill, { backgroundColor: tokens['surface-2'] }]}>
            <Icon size={15} color={tokens['text-2']} />
            <Text style={{ color: tokens['text-2'], fontSize: 12.5 }}>{l.platform}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
});
