import { dbPromise, getDatabase } from '../databaseLifecycle'
import {
  deleteFromCache, notificationsCache,
  statusesCache
} from '../cache'
import {
  NOTIFICATION_TIMELINES_STORE,
  NOTIFICATIONS_STORE, PINNED_STATUSES_STORE,
  STATUS_TIMELINES_STORE,
  STATUSES_STORE,
  THREADS_STORE
} from '../constants'
import {
  createThreadKeyRange
} from '../keys'
import { deleteAll } from '../utils'

export async function deleteStatusesAndNotifications (instanceName, statusIds, notificationIds) {
  for (let statusId of statusIds) {
    deleteFromCache(statusesCache, instanceName, statusId)
  }
  for (let notificationId of notificationIds) {
    deleteFromCache(notificationsCache, instanceName, notificationId)
  }
  const db = await getDatabase(instanceName)
  let storeNames = [
    STATUSES_STORE,
    STATUS_TIMELINES_STORE,
    NOTIFICATIONS_STORE,
    NOTIFICATION_TIMELINES_STORE,
    PINNED_STATUSES_STORE,
    THREADS_STORE
  ]
  await dbPromise(db, storeNames, 'readwrite', (stores) => {
    let [
      statusesStore,
      statusTimelinesStore,
      notificationsStore,
      notificationTimelinesStore,
      pinnedStatusesStore,
      threadsStore
    ] = stores

    function deleteStatus (statusId) {
      statusesStore.delete(statusId)
      deleteAll(
        pinnedStatusesStore,
        pinnedStatusesStore.index('statusId'),
        IDBKeyRange.only(statusId)
      )
      deleteAll(
        statusTimelinesStore,
        statusTimelinesStore.index('statusId'),
        IDBKeyRange.only(statusId)
      )
      deleteAll(
        threadsStore,
        threadsStore.index('statusId'),
        IDBKeyRange.only(statusId)
      )
      deleteAll(
        threadsStore,
        threadsStore,
        createThreadKeyRange(statusId)
      )
    }

    function deleteNotification (notificationId) {
      notificationsStore.delete(notificationId)
      deleteAll(
        notificationTimelinesStore,
        notificationTimelinesStore.index('notificationId'),
        IDBKeyRange.only(notificationId)
      )
    }

    for (let statusId of statusIds) {
      deleteStatus(statusId)
    }
    for (let notificationId of notificationIds) {
      deleteNotification(notificationId)
    }
  })
}
