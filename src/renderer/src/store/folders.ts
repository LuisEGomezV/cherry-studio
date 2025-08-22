import { createEntityAdapter, createSelector, createSlice, EntityState, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '.'
import type { Folder, Topic } from '@renderer/types'
import { uniq } from 'lodash'

// Folders backend slice
// - Folders store topicIds just like Assistants
// - There is an invisible root folder that holds topics that are not assigned to any folder
// - Folders support hierarchical parent-child relation via parentFolderId (nullable)

const sanitizeFolder = (folder: Folder): Folder => {
  const now = new Date().toISOString()
  if (!folder.createdAt) folder.createdAt = now
  if (!folder.updatedAt) folder.updatedAt = now
  if (!folder.topicIds) folder.topicIds = []
  // ensure uniqueness
  folder.topicIds = uniq(folder.topicIds)
  return folder
}

const foldersAdapter = createEntityAdapter<Folder, string>({
  selectId: (f) => f.id,
  sortComparer: (a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || '')
})

export interface FoldersState extends EntityState<Folder, string> {}

const initialState: FoldersState = foldersAdapter.getInitialState()

const foldersSlice = createSlice({
  name: 'folders',
  initialState,
  reducers: {
    addFolder: (state, action: PayloadAction<Folder>) => {
      foldersAdapter.addOne(state, sanitizeFolder(action.payload))
    },
    addFolders: (state, action: PayloadAction<Folder[]>) => {
      foldersAdapter.addMany(state, action.payload.map(sanitizeFolder))
    },
    upsertFolder: (state, action: PayloadAction<Folder>) => {
      foldersAdapter.upsertOne(state, sanitizeFolder(action.payload))
    },
    upsertFolders: (state, action: PayloadAction<Folder[]>) => {
      foldersAdapter.upsertMany(state, action.payload.map(sanitizeFolder))
    },
    updateFolder: (state, action: PayloadAction<Folder>) => {
      const f = sanitizeFolder(action.payload)
      foldersAdapter.updateOne(state, { id: f.id, changes: f })
    },
    removeFolderById: (state, action: PayloadAction<string>) => {
      foldersAdapter.removeOne(state, action.payload)
    },
    removeFoldersById: (state, action: PayloadAction<string[]>) => {
      foldersAdapter.removeMany(state, action.payload)
    },
    // Assign a set of topics to a folder (replaces by moving from any other folder/unassigned)
    assignTopicsToFolder: (
      state,
      action: PayloadAction<{ folderId: string; topicIds: string[] }>
    ) => {
      const { folderId, topicIds } = action.payload
      // Remove topicIds from any folder that currently contains them
      const existing = Object.values(state.entities).filter(Boolean) as Folder[]
      for (const f of existing) {
        const before = f.topicIds || []
        const after = before.filter((id) => !topicIds.includes(id))
        if (after.length !== before.length) {
          foldersAdapter.updateOne(state, { id: f.id, changes: { topicIds: after, updatedAt: new Date().toISOString() } })
        }
      }
      const target = state.entities[folderId]
      if (target) {
        const merged = uniq([...(target.topicIds || []), ...topicIds])
        foldersAdapter.updateOne(state, { id: folderId, changes: { topicIds: merged, updatedAt: new Date().toISOString() } })
      }
    },
    // Move topics between folders. If sourceFolderId is undefined, topics are from the invisible root (unassigned)
    moveTopics: (
      state,
      action: PayloadAction<{ sourceFolderId?: string; targetFolderId?: string; topicIds: string[] }>
    ) => {
      const { sourceFolderId, targetFolderId, topicIds } = action.payload
      const now = new Date().toISOString()

      if (sourceFolderId) {
        const src = state.entities[sourceFolderId]
        if (src) {
          const filtered = (src.topicIds || []).filter((id) => !topicIds.includes(id))
          foldersAdapter.updateOne(state, { id: sourceFolderId, changes: { topicIds: filtered, updatedAt: now } })
        }
      }

      if (targetFolderId) {
        const dst = state.entities[targetFolderId]
        if (dst) {
          const merged = uniq([...(dst.topicIds || []), ...topicIds])
          foldersAdapter.updateOne(state, { id: targetFolderId, changes: { topicIds: merged, updatedAt: now } })
        }
      }
      // If no targetFolderId, topics become unassigned (implicitly in root)
    }
  }
})

export const foldersReducer = foldersSlice.reducer
export const foldersActions = foldersSlice.actions

// Selectors
const baseSelectors = foldersAdapter.getSelectors<RootState>((state) => state.folders)
export const selectFolderById = baseSelectors.selectById
export const selectAllFolders = baseSelectors.selectAll

export const selectChildFolders = createSelector([
  selectAllFolders,
  (_: RootState, parentFolderId: string | null) => parentFolderId
], (folders, parentId) => folders.filter((f) => (f.parentFolderId ?? null) === parentId))

// Helper: set of topicIds contained in any folder
export const selectAllFolderTopicIdSet = createSelector([
  selectAllFolders
], (folders) => {
  const set = new Set<string>()
  for (const f of folders) {
    for (const id of f.topicIds || []) set.add(id)
  }
  return set
})

export const selectUnassignedTopics = createSelector([
  (state: RootState) => state.topics,
  selectAllFolderTopicIdSet
], (topicsState, idSet) => {
  // Use topics adapter selectors indirectly to avoid circular import
  const allTopics = (topicsState.ids as string[]).map((id) => topicsState.entities[id]!).filter(Boolean) as Topic[]
  return allTopics.filter((t) => !idSet.has(t.id))
})

export const selectFolderTopics = createSelector([
  (state: RootState) => state.topics,
  (_: RootState, folderId: string) => folderId,
  baseSelectors.selectEntities
], (topicsState, folderId, folderEntities) => {
  const folder = folderEntities[folderId]
  if (!folder) return []
  const ids = folder.topicIds || []
  const byId = topicsState.entities
  return ids.map((id) => byId[id]).filter(Boolean) as Topic[]
})
