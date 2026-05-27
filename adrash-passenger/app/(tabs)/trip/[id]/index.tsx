// app/(tabs)/trips/[id]/index.tsx
// This file must exist (Expo Router sees the folder) but we redirect
// immediately to the canonical trip detail screen at trip/[id]/index.
// DO NOT add real content here — it creates a phantom 5th tab.
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TripDetailRedirect() {
    const { id } = useLocalSearchParams<{ id: string }>();
    return <Redirect href={`/(tabs)/trip/${id}/index`} />;
}