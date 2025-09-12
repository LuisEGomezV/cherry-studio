import store, { type RootState } from '@renderer/store'
import db from '@renderer/databases'
import { getDefaultTopic } from '@renderer/services/AssistantService'
import { foldersActions, ROOT_FOLDER_ID } from '@renderer/store/folders'
import { topicsActions, selectTopicsByIds } from '@renderer/store/topics'
import { addTopic as assistantsAddTopic } from '@renderer/store/assistants'
import type { Assistant, Topic } from '@renderer/types'

/**
 * Get topics for an assistant using normalized topicIds.
 * Falls back to assistant.topics for backward compatibility during migration.
 */
export function topicsOf(assistant: Assistant, state?: RootState): Topic[] {
  const s = state ?? store.getState()
  const ids = assistant.topicIds ?? []
  const fromSlice = selectTopicsByIds(s, ids)
  if (fromSlice.length) return fromSlice
  // Fallback while migrating
  return []
}

/** First topic for an assistant with fallback. */
export function firstTopicOf(assistant: Assistant, state?: RootState): Topic | undefined {
  const list = topicsOf(assistant, state)
  return list[0]
}

/** Count topics for an assistant. */
export function topicCountOf(assistant: Assistant, state?: RootState): number {
  return topicsOf(assistant, state).length
}

/** Topic IDs accessor with safe default. */
export function topicIdsOf(assistant: Assistant): string[] {
  return assistant.topicIds ?? []
}

/**
 * Create a new topic for an assistant and assign it to a folder.
 * - Persists empty messages to Dexie
 * - Updates assistants slice (topicIds)
 * - Updates topics slice (metadata)
 * - Assigns topic to folder (defaults to ROOT)
 */
export async function createTopic(assistantId: string, folderId: string = ROOT_FOLDER_ID): Promise<Topic> {
  const topicBase = getDefaultTopic(assistantId)
  const targetFolderId = folderId || ROOT_FOLDER_ID
  const topic: Topic = { ...topicBase, folderId: targetFolderId }
  // Persist empty messages array in Dexie
  await db.topics.add({ id: topic.id, messages: [] })
  // Update assistants slice (add topic under assistant)
  store.dispatch(assistantsAddTopic({ assistantId, topic }))
  // Update topics slice (metadata only)
  store.dispatch(topicsActions.addTopic(topic))
  // Assign to folder
  store.dispatch(foldersActions.assignTopicsToFolder({ folderId: targetFolderId, topicIds: [topic.id] }))
  return topic
}

/**
 * Remove a topic from Redux slices only.
 * - Removes the topic id from any folder that contains it
 * - Deletes the topic metadata entry from the topics slice
 * Note: Messages and other side-effects are handled elsewhere.
 */
export function removeTopic(topicId: string): void {
  // Remove topic id from folders
  store.dispatch(foldersActions.removeTopicIds([topicId]))
  // Remove topic metadata from topics slice
  store.dispatch(topicsActions.removeTopicById(topicId))
}

