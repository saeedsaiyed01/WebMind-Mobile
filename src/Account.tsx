import React, { useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { Button, Chip, SegmentedButtons } from "react-native-paper";
import * as WebBrowser from "expo-web-browser";
import { User, Plan, request } from "./api";
import { Body, Heading, Label, Orb, Icon, useSharedStyles } from "./components";
import { useAppTheme } from "./theme";

export function Account({
  user,
  plan,
  refresh,
  logout,
  notify,
}: {
  user: User;
  plan: Plan | null;
  refresh: () => Promise<void>;
  logout: () => void;
  notify: (message: string) => void;
}) {
  const { colors: c, preference, setPreference } = useAppTheme();
  const s = useSharedStyles();

  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  async function checkout(id: string) {
    setBusy(id);
    try {
      const data = await request("/create-session", "POST", {
        plan: id,
        email: user.email || user.username,
        name: user.name || user.username,
      });
      if (!/^https:\/\//.test(data.checkout_url || ""))
        throw new Error("The checkout link is unavailable. Please try again.");
      await WebBrowser.openBrowserAsync(data.checkout_url);
      if (data.session_id) {
        const result = await request("/status/" + data.session_id);
        notify(
          result.status === "succeeded" || result.status === "completed"
            ? "Payment received. Your plan will update shortly."
            : "Your plan updates after payment confirmation.",
        );
      }
      await refresh();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: 34 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refresh();
            setRefreshing(false);
          }}
        />
      }
    >
      <View>
        <Label>YOUR WORKSPACE</Label>
        <Heading style={{ marginTop: 8 }}>Account</Heading>
      </View>
      <View style={[s.card, { gap: 18 }]}>
        <View style={s.row}>
          <Orb size={56} active={false} />
          <View style={{ flex: 1 }}>
            <Heading style={{ fontSize: 21, lineHeight: 29 }}>
              {user.name || user.username.split("@")[0].split(/[._-]/)[0]}
            </Heading>
            <Body lines={1} style={{ fontSize: 12 }}>
              {user.email || user.username}
            </Body>
          </View>
        </View>
        <View
          style={[
            s.between,
            { borderTopWidth: 1, borderColor: c.line, paddingTop: 16 },
          ]}
        >
          <Chip style={{ backgroundColor: c.accentSoft }}>
            {(plan?.plan || "free").toUpperCase()} WORKSPACE
          </Chip>
          <Body style={{ color: c.accent }}>
            {plan?.credits ?? user.credits} credits
          </Body>
        </View>
        {plan?.planExpiry && (
          <Body style={{ fontSize: 12 }}>
            Plan active until {new Date(plan.planExpiry).toLocaleDateString()}
          </Body>
        )}
      </View>
      <View>
        <Label>PLANS AND CREDITS</Label>
        <Heading style={{ fontSize: 24, lineHeight: 33, marginTop: 6 }}>
          More room to explore
        </Heading>
        <Body style={{ marginTop: 6 }}>
          Each AI answer uses one credit. Your memories and conversations stay
          connected.
        </Body>
      </View>
      <View style={[s.card, { gap: 16 }]}>
        <Label>APPEARANCE</Label>
        <Body>Choose your look, or follow your device.</Body>
        <SegmentedButtons
          value={preference}
          onValueChange={(value) => {
            void setPreference(value as "system" | "light" | "dark").catch(() =>
              notify("Appearance changed. We couldn’t save it on this device."),
            );
          }}
          buttons={[
            {
              value: "system",
              label: "System",
              icon: "cellphone",
              accessibilityLabel: "Use system appearance",
            },
            {
              value: "light",
              label: "Light",
              icon: "white-balance-sunny",
              accessibilityLabel: "Use light appearance",
            },
            {
              value: "dark",
              label: "Dark",
              icon: "weather-night",
              accessibilityLabel: "Use dark appearance",
            },
          ]}
        />
      </View>
      {[
        {
          id: "pro",
          name: "Pro",
          price: 8,
          credits: 100,
          description: "For a curious mind, every day.",
          tint: c.paper,
        },
        {
          id: "premium",
          name: "Premium",
          price: 16,
          credits: 300,
          description: "More space for your biggest ideas.",
          tint: c.accentSoft,
        },
      ].map((item) => (
        <View
          key={item.id}
          style={[s.card, { backgroundColor: item.tint, gap: 14 }]}
        >
          <View style={s.between}>
            <Heading style={{ fontSize: 24, lineHeight: 32 }}>
              {item.name}
            </Heading>
            <Text
              style={{
                fontFamily: "Manrope_600SemiBold",
                fontSize: 27,
                color: c.ink,
              }}
            >
              ${item.price}
              <Text style={{ fontSize: 12, color: c.muted }}> / plan</Text>
            </Text>
          </View>
          <Body>{item.description}</Body>
          <View style={s.row}>
            <Icon name="check-circle" color={c.accent} size={16} />
            <Body style={{ color: c.ink }}>
              {item.credits} credits to explore
            </Body>
          </View>
          <View style={s.row}>
            <Icon name="check-circle" color={c.accent} size={16} />
            <Body style={{ color: c.ink }}>
              All available AI models · Your full memory library
            </Body>
          </View>
          <Button
            mode={item.id === "premium" ? "contained" : "outlined"}
            disabled={!!busy}
            loading={busy === item.id}
            onPress={() => checkout(item.id)}
            contentStyle={{ height: 48 }}
            style={{ borderRadius: 14 }}
          >
            {plan?.plan === item.id
              ? "Add more credits"
              : `Explore ${item.name}`}{" "}
            ↗
          </Button>
        </View>
      ))}
      <Body style={{ fontSize: 12 }}>
        Checkout is handled securely by your existing payment provider. The
        checkout page shows the final price and terms.
      </Body>
      {!!plan?.recentTransactions?.length && (
        <View style={[s.card, { gap: 12 }]}>
          <Label>RECENT ACTIVITY</Label>
          {plan.recentTransactions.map((tx, i) => (
            <View key={tx.paymentId || i} style={s.between}>
              <Body style={{ color: c.ink }}>
                {tx.plan
                  ? `${tx.plan} · ${tx.amount ?? 0}`
                  : `${tx.credits ?? 0} credit${Math.abs(tx.credits ?? 0) === 1 ? "" : "s"} · AI conversation`}
              </Body>
              <Body style={{ fontSize: 12 }}>{tx.status}</Body>
            </View>
          ))}
        </View>
      )}
      <View style={[s.card, { gap: 12 }]}>
        <View style={s.row}>
          <Icon name="shield" color={c.accent} />
          <Heading style={{ fontSize: 18, lineHeight: 26 }}>
            Session and security
          </Heading>
        </View>
        <Body style={{ fontSize: 12 }}>
          Your session is stored securely on this device. Sign out when you’re
          ready to leave.
        </Body>
        {confirm ? (
          <View style={s.row}>
            <Button textColor={c.danger} onPress={logout}>
              Sign out now
            </Button>
            <Button onPress={() => setConfirm(false)}>Stay here</Button>
          </View>
        ) : (
          <Button
            mode="text"
            onPress={() => setConfirm(true)}
            style={{ alignSelf: "flex-start" }}
          >
            Sign out
          </Button>
        )}
      </View>
      <Body style={{ textAlign: "center", fontSize: 12 }}>
        WEBMIND MOBILE · VERSION 1.1.0
      </Body>
    </ScrollView>
  );
}
