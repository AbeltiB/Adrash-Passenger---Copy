// Redirect shim — old plural path /trips/:id → canonical /trip/:id
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TripsRedirect() {
    const { id } = useLocalSearchParams<{ id: string }>();
    return <Redirect href={`/(tabs)/trip/${id}` as never} />;
}
