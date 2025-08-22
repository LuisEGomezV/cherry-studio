import { createEntityAdapter, createSelector, createSlice, EntityState, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '.'
import type { Topic } from '@renderer/types'
import { isEmpty, uniqBy } from 'lodash'

// NOTE: Topics in Redux should only contain metadata; messages are in Dexie.
// We defensively clear any messages array that might be passed in.

const sanitizeTopic = (topic: Topic): Topic => {
  if (!topic.createdAt) topic.createdAt = new Date().toISOString()
  if (!topic.updatedAt) topic.updatedAt = new Date().toISOString()
  // Strip messages from redux state to avoid heavy persistence
  if (!isEmpty(topic.messages)) topic = { ...topic, messages: [] }
  return topic
}

const topicsAdapter = createEntityAdapter<Topic, string>({
  selectId: (t) => t.id,
  sortComparer: (a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || '')
})

export interface TopicsState extends EntityState<Topic, string> {}

const initialState: TopicsState = topicsAdapter.getInitialState()

const topicsSlice = createSlice({
  name: 'topics',
  initialState,
  reducers: {
    upsertTopic: (state, action: PayloadAction<Topic>) => {
      topicsAdapter.upsertOne(state, sanitizeTopic(action.payload))
    },
    upsertTopics: (state, action: PayloadAction<Topic[]>) => {
      topicsAdapter.upsertMany(state, action.payload.map(sanitizeTopic))
    },
    addTopic: (state, action: PayloadAction<Topic>) => {
      topicsAdapter.addOne(state, sanitizeTopic(action.payload))
    },
    addTopics: (state, action: PayloadAction<Topic[]>) => {
      topicsAdapter.addMany(state, action.payload.map(sanitizeTopic))
    },
    removeTopicById: (state, action: PayloadAction<string>) => {
      topicsAdapter.removeOne(state, action.payload)
    },
    removeTopicsById: (state, action: PayloadAction<string[]>) => {
      topicsAdapter.removeMany(state, action.payload)
    },
    updateTopic: (state, action: PayloadAction<Topic>) => {
      const t = sanitizeTopic(action.payload)
      topicsAdapter.updateOne(state, { id: t.id, changes: t })
    },
    replaceAll: (state, action: PayloadAction<Topic[]>) => {
      // ensure unique by id
      const items = uniqBy(action.payload.map(sanitizeTopic), 'id')
      topicsAdapter.setAll(state, items)
    }
  }
})

export const topicsReducer = topicsSlice.reducer
export const topicsActions = topicsSlice.actions

// Selectors
const baseSelectors = topicsAdapter.getSelectors<RootState>((state) => state.topics)
export const selectTopicById = baseSelectors.selectById
export const selectAllTopics = baseSelectors.selectAll
export const selectTopicsByIds = createSelector([
  selectAllTopics,
  (_: RootState, ids: string[] | undefined) => ids || []
], (all, ids) => all.filter((t) => ids.includes(t.id)))

export const selectAssistantTopics = createSelector([
  (state: RootState) => state.assistants.assistants,
  selectAllTopics,
  (_: RootState, assistantId: string) => assistantId
], (assistants, topics, assistantId) => {
  const assistant = assistants.find((a) => a.id === assistantId)
  if (!assistant) return []
  const ids = assistant.topicIds || []
  return topics.filter((t) => ids.includes(t.id))
})
