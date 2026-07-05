import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';

const PLAYLISTS_URL = 'https://www.broadcastify.com/calls/playlists/';
const LOGIN_URL =
  'https://www.broadcastify.com/login/?redirect=%2Fcalls%2Fplaylists%2F';
const BROADCASTIFY_HOSTS = new Set([
  'www.broadcastify.com',
  'broadcastify.com',
  'register.radioreference.com',
]);

type Playlist = {
  name: string;
  url: string;
  uuid: string;
};

type BrowserScreen =
  | { kind: 'dashboard' }
  | { kind: 'login' }
  | { kind: 'playlist'; playlist: Playlist };

type SyncMessage = {
  type: 'playlist-sync';
  signedIn: boolean;
  playlists: Playlist[];
};

const PLAYLIST_EXTRACTOR = `
  (function () {
    try {
      var pageUrl = new URL(window.location.href);
      var normalizedPath = pageUrl.pathname.replace(/\\/+$/, '/') || '/';
      var isPlaylistIndex =
        normalizedPath === '/calls/playlists/' &&
        !pageUrl.searchParams.has('uuid');

      if (!isPlaylistIndex) {
        return true;
      }

      var accountNameNode = document.querySelector('.portalv2-account-name');
      var accountName = accountNameNode
        ? (accountNameNode.textContent || '').trim()
        : '';
      var hasLoginForm =
        !!document.querySelector('input[name="username"]') &&
        !!document.querySelector('input[name="password"]');
      var signedIn =
        accountName.toLowerCase() !== 'guest' &&
        !hasLoginForm;
      var byUuid = {};

      document
        .querySelectorAll('a[href*="/calls/playlists/?uuid="]')
        .forEach(function (anchor) {
          var destination = new URL(anchor.href, window.location.origin);
          var uuid = destination.searchParams.get('uuid');
          var name = (anchor.textContent || '').replace(/\\s+/g, ' ').trim();

          if (
            uuid &&
            name &&
            destination.hostname === 'www.broadcastify.com'
          ) {
            byUuid[uuid] = {
              uuid: uuid,
              name: name,
              url: destination.href,
            };
          }
        });

      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'playlist-sync',
          signedIn: signedIn,
          playlists: Object.keys(byUuid)
            .map(function (uuid) { return byUuid[uuid]; })
            .sort(function (a, b) {
              return a.name.localeCompare(b.name);
            }),
        })
      );
    } catch (error) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'playlist-sync-error',
          message: String(error),
        })
      );
    }

    return true;
  })();
`;

export default function App() {
  const syncWebView = useRef<WebView>(null);
  const [screen, setScreen] = useState<BrowserScreen>({ kind: 'dashboard' });
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshPlaylists = useCallback(() => {
    setRefreshing(true);
    syncWebView.current?.reload();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => syncWebView.current?.reload(), 60_000);
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') {
          syncWebView.current?.reload();
        }
      },
    );

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, []);

  const handleSyncMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as SyncMessage;
      if (message.type !== 'playlist-sync') {
        return;
      }

      setSignedIn(message.signedIn);
      setPlaylists(message.playlists);
      setRefreshing(false);
      setScreen((current) =>
        current.kind === 'login' && message.signedIn
          ? { kind: 'dashboard' }
          : current,
      );
    } catch {
      setRefreshing(false);
    }
  }, []);

  const allowBroadcastifyNavigation = useCallback(
    (request: WebViewNavigation) => {
      try {
        const destination = new URL(request.url);
        if (BROADCASTIFY_HOSTS.has(destination.hostname)) {
          return true;
        }

        void Linking.openURL(request.url);
        return false;
      } catch {
        return false;
      }
    },
    [],
  );

  const browserSource =
    screen.kind === 'login'
      ? { uri: LOGIN_URL }
      : screen.kind === 'playlist'
        ? { uri: screen.playlist.url }
        : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <WebView
        ref={syncWebView}
        source={{ uri: PLAYLISTS_URL }}
        injectedJavaScript={PLAYLIST_EXTRACTOR}
        onMessage={handleSyncMessage}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        style={styles.syncWebView}
      />

      {screen.kind === 'dashboard' ? (
        <>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>BROADCASTIFY CALLS</Text>
              <Text style={styles.title}>My Playlists</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh playlists"
              onPress={refreshPlaylists}
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.refreshButtonText}>↻</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshPlaylists}
                tintColor="#ffd200"
              />
            }
          >
            {signedIn === null ? (
              <View style={styles.messageCard}>
                <ActivityIndicator color="#ffd200" size="large" />
                <Text style={styles.messageTitle}>Checking your session…</Text>
              </View>
            ) : !signedIn ? (
              <View style={styles.messageCard}>
                <Text style={styles.radioIcon}>◉</Text>
                <Text style={styles.messageTitle}>Connect Broadcastify</Text>
                <Text style={styles.messageBody}>
                  Sign in once. Your credentials stay on Broadcastify&apos;s
                  page, and the app keeps the resulting session cookie.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setScreen({ kind: 'login' })}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    Sign in to Broadcastify
                  </Text>
                </Pressable>
              </View>
            ) : playlists.length === 0 ? (
              <View style={styles.messageCard}>
                <Text style={styles.radioIcon}>＋</Text>
                <Text style={styles.messageTitle}>No playlists yet</Text>
                <Text style={styles.messageBody}>
                  Add a playlist on Broadcastify, then pull down to refresh.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setScreen({
                      kind: 'playlist',
                      playlist: {
                        name: 'Manage playlists',
                        url: PLAYLISTS_URL,
                        uuid: 'manage',
                      },
                    })
                  }
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    Open Broadcastify
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.countLabel}>
                  {playlists.length}{' '}
                  {playlists.length === 1 ? 'playlist' : 'playlists'}
                </Text>
                <View style={styles.playlistGrid}>
                  {playlists.map((playlist) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${playlist.name}`}
                      key={playlist.uuid}
                      onPress={() =>
                        setScreen({ kind: 'playlist', playlist })
                      }
                      style={({ pressed }) => [
                        styles.playlistButton,
                        pressed && styles.playlistButtonPressed,
                      ]}
                    >
                      <View style={styles.playBadge}>
                        <Text style={styles.playBadgeText}>▶</Text>
                      </View>
                      <Text style={styles.playlistName}>{playlist.name}</Text>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.syncNote}>
                  Refreshes every minute while the app is open.
                </Text>
              </>
            )}
          </ScrollView>
        </>
      ) : (
        <View style={styles.browserContainer}>
          <View style={styles.browserHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to playlists"
              onPress={() => {
                setScreen({ kind: 'dashboard' });
                syncWebView.current?.reload();
              }}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backButtonText}>‹ Playlists</Text>
            </Pressable>
            <Text numberOfLines={1} style={styles.browserTitle}>
              {screen.kind === 'login'
                ? 'Sign in'
                : screen.playlist.name}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          {browserSource ? (
            <WebView
              source={browserSource}
              injectedJavaScript={PLAYLIST_EXTRACTOR}
              onMessage={handleSyncMessage}
              onShouldStartLoadWithRequest={allowBroadcastifyNavigation}
              onNavigationStateChange={(navigation) => {
                if (
                  screen.kind === 'login' &&
                  navigation.url === PLAYLISTS_URL
                ) {
                  syncWebView.current?.reload();
                }
              }}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              setSupportMultipleWindows={false}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.browserLoading}>
                  <ActivityIndicator color="#ffd200" size="large" />
                </View>
              )}
              style={styles.browser}
            />
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090603',
  },
  syncWebView: {
    position: 'absolute',
    left: -2,
    top: -2,
    width: 1,
    height: 1,
    opacity: 0,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#090603',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 16,
  },
  eyebrow: {
    color: '#ffd200',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 3,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: '#24170b',
    borderColor: '#8f682b',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 25,
    marginTop: -2,
  },
  content: {
    backgroundColor: '#f4ead6',
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 34,
    paddingTop: 22,
  },
  messageCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d8bd83',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 30,
    shadowColor: '#321906',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  radioIcon: {
    color: '#d50909',
    fontSize: 44,
    marginBottom: 10,
  },
  messageTitle: {
    color: '#1d1107',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  messageBody: {
    color: '#725c40',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#c90000',
    borderRadius: 13,
    marginTop: 24,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#090603',
    borderRadius: 13,
    marginTop: 24,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  countLabel: {
    color: '#725c40',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  playlistGrid: {
    gap: 11,
  },
  playlistButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d8bd83',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#321906',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  playlistButtonPressed: {
    backgroundColor: '#fff6cf',
    borderColor: '#ffd200',
    transform: [{ scale: 0.99 }],
  },
  playBadge: {
    alignItems: 'center',
    backgroundColor: '#ffd200',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginRight: 13,
    width: 44,
  },
  playBadgeText: {
    color: '#090603',
    fontSize: 15,
    marginLeft: 2,
  },
  playlistName: {
    color: '#1d1107',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  chevron: {
    color: '#9b7740',
    fontSize: 29,
    marginLeft: 8,
    marginTop: -2,
  },
  syncNote: {
    color: '#725c40',
    fontSize: 12,
    marginTop: 18,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  browserContainer: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  browserHeader: {
    alignItems: 'center',
    backgroundColor: '#090603',
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 12,
  },
  backButton: {
    minWidth: 88,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#ffd200',
    fontSize: 16,
    fontWeight: '700',
  },
  browserTitle: {
    color: '#ffffff',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 88,
  },
  browser: {
    flex: 1,
  },
  browserLoading: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
