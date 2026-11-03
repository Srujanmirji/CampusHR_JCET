import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../lib/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const campusImg = require('../../assets/jcet-campus.png');

export function WebWelcomeBanner({
  title = 'Welcome to CampusHR',
  subtitle = 'Jain College of Engineering and Technology, Hubballi',
  bullets = ['Manage People', 'Simplify Processes', 'Enable Academic Excellence'],
}: {
  title?: string;
  subtitle?: string;
  bullets?: string[];
}) {
  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
        <View style={styles.bullets}>
          {bullets.map((bullet, idx) => (
            <React.Fragment key={bullet}>
              {idx > 0 && <Text style={styles.dot}>•</Text>}
              <Text style={styles.bulletText}>{bullet}</Text>
            </React.Fragment>
          ))}
        </View>
      </View>
      <Image
        source={campusImg}
        style={styles.image}
        accessibilityLabel="JCET campus building visual"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#0B132B',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 3,
  },
  content: {
    flex: 1,
    padding: theme.spacing.section,
    zIndex: 1,
    gap: 4,
  },
  title: {
    fontFamily: theme.typography.headingFamily,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 12,
    color: '#DBEAFE',
    lineHeight: 16,
  },
  bullets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  bulletText: {
    fontFamily: theme.typography.bodyFamily,
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  dot: {
    color: theme.colors.brandOrange,
    fontSize: 12,
    fontWeight: '700',
  },
  image: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 140,
    height: '100%',
    opacity: 0.28,
  },
});
