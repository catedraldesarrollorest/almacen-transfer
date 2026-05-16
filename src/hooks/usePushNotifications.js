import { useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = 'BET7tRR_zpeVybKec-sCWBR-XEMYMWg57YGBintn0aplKH-ZJEoL9kdLjpzdfNBq8aaWhiINTTwMEyE16-wO868'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const { warehouseId, loading } = useAuth()

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!warehouseId) return

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      const { endpoint, keys } = subscription.toJSON()
      await supabase.from('push_subscriptions').upsert(
        { warehouse_id: warehouseId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: 'endpoint' }
      )
    } catch (err) {
      console.error('Push subscription failed:', err)
    }
  }, [warehouseId])

  useEffect(() => {
    if (!loading && warehouseId) {
      // Delay to avoid blocking initial render
      const timer = setTimeout(subscribe, 3000)
      return () => clearTimeout(timer)
    }
  }, [loading, warehouseId, subscribe])
}
