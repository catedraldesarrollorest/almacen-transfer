import { useState, useCallback, useEffect } from 'react'
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
  const { warehouseId, loading: authLoading } = useAuth()
  const [status, setStatus] = useState('idle') // idle | loading | granted | denied | error

  const isSupported = typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  const subscribe = useCallback(async () => {
    if (!isSupported || !warehouseId) return false
    setStatus('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return false
      }

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      const sub = subscription.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        { warehouse_id: warehouseId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        { onConflict: 'endpoint' }
      )
      if (error) throw error

      setStatus('granted')
      return true
    } catch (err) {
      console.error('Push subscribe error:', err)
      setStatus('error')
      return false
    }
  }, [warehouseId, isSupported])

  // Auto-subscribe on first load if permission already granted
  useEffect(() => {
    if (authLoading || !warehouseId || !isSupported) return
    if (Notification.permission === 'granted') {
      subscribe()
    } else {
      setStatus(Notification.permission === 'denied' ? 'denied' : 'idle')
    }
  }, [authLoading, warehouseId])

  return { status, subscribe, isSupported }
}
