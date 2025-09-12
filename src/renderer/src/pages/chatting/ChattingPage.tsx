import { useAssistants } from '@renderer/hooks/useAssistant'
import { useActiveTopic } from '@renderer/hooks/useTopic'
import { useNavbarPosition, useSettings } from '@renderer/hooks/useSettings'
import { useShowAssistants } from '@renderer/hooks/useStore'
import { Assistant, Topic } from '@renderer/types'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { foldersActions, selectAllFolders, ROOT_FOLDER_ID } from '@renderer/store/folders'
import { topicsActions, selectAllTopics } from '@renderer/store/topics'
import { createTopic } from '@renderer/utils/topics'
import type { FolderItem as UITreeItem } from '@renderer/types/folder'
import { loggerService } from '@renderer/services/LoggerService'
import { FC, useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import ChattingNavbar from './ChattingNavbar'
import Chat from '../home/Chat'
import FolderTree from '../../components/folder/FolderTree'
import ChattingTopicItem from './components/ChattingTopicItem'
import { nanoid } from 'nanoid'

const ChattingPage: FC = () => {
  const { assistants } = useAssistants()
  const logger = loggerService.withContext('ChattingPage')
  const location = useLocation()
  const state = location.state as { assistant?: Assistant; topic?: Topic } | undefined
  const { isLeftNavbar } = useNavbarPosition()
  const { showTopicTime } = useSettings()
  const { showAssistants } = useShowAssistants()

  const [activeAssistant, setActiveAssistant] = useState<Assistant | undefined>(
    state?.assistant || (assistants.length > 0 ? assistants[0] : undefined)
  )
  const { activeTopic, setActiveTopic } = useActiveTopic(activeAssistant?.id || '', state?.topic)
  const dispatch = useAppDispatch()
  const defaultAssistant = useAppSelector((state) => state.assistants.defaultAssistant)

  // Real folders and topics from store
  const folders = useAppSelector(selectAllFolders)
  const sliceTopics = useAppSelector(selectAllTopics)
  const topicById = new Map(sliceTopics.map((t) => [t.id, t]))

  const buildFolderTreeData = useCallback((): UITreeItem[] => {
    // Build from real root folder: show its contents (topics and child folders), not the root node itself
    const byParent = new Map<string, string[]>()
    for (const f of folders) {
      const parent = f.parentFolderId ?? ''
      const arr = byParent.get(parent) || []
      arr.push(f.id)
      byParent.set(parent, arr)
    }

    const makeNode = (folderId: string): UITreeItem | null => {
      const f = folders.find((x) => x.id === folderId)
      if (!f) return null
      const childFolderIds = byParent.get(f.id) || []
      const childFolders = childFolderIds.map((id) => makeNode(id)).filter(Boolean) as UITreeItem[]
      const folderTopics = (f.topicIds || [])
        .map((id) => topicById.get(id))
        .filter(Boolean)
        .map((t) => ({ id: t!.id, name: t!.name, type: 'chat' as const }))
      return {
        id: f.id,
        name: f.name,
        type: 'folder',
        isOpen: true,
        children: [...childFolders, ...folderTopics]
      }
    }

    const root = folders.find((f) => f.id === ROOT_FOLDER_ID)
    if (!root) return []
    const rootChildren = (byParent.get(ROOT_FOLDER_ID) || [])
      .map((id) => makeNode(id))
      .filter(Boolean) as UITreeItem[]
    const rootTopics = (root.topicIds || [])
      .map((id) => topicById.get(id))
      .filter(Boolean)
      .map((t) => ({ id: t!.id, name: t!.name, type: 'chat' as const }))

    // Include any topics not assigned to any folder yet (e.g., during first-run migration)
    const assignedSet = new Set<string>()
    for (const f of folders) for (const id of f.topicIds || []) assignedSet.add(id)
    const unassignedExtras = sliceTopics
      .filter((t) => !assignedSet.has(t.id))
      .map((t) => ({ id: t.id, name: t.name, type: 'chat' as const }))

    // Return only root contents, always open. Folders first, then topics (root-assigned), then unassigned extras
    return [...rootChildren, ...rootTopics, ...unassignedExtras]
  }, [folders, topicById, sliceTopics])

  // Handle any necessary side effects
  useEffect(() => {
    try {
      logger.debug('Assistants/ActiveAssistant check', {
        assistantsCount: assistants.length,
        hasActiveAssistant: !!activeAssistant
      })
      if (assistants.length > 0 && !activeAssistant) {
        setActiveAssistant(assistants[0])
        logger.info('Set default active assistant', { assistantId: assistants[0]?.id })
      }
    } catch (err) {
      logger.error('Error in assistants init effect', err as any)
    }
  }, [assistants, activeAssistant])

  // No hydration from assistant.topics; topics slice is the single source of truth

  // Ensure a real root folder exists and migrate items to root-based model
  useEffect(() => {
    const now = new Date().toISOString()
    const root = folders.find((f) => f.id === ROOT_FOLDER_ID)
    if (!root) {
      dispatch(
        foldersActions.addFolder({
          id: ROOT_FOLDER_ID,
          name: 'Root',
          parentFolderId: null,
          topicIds: [],
          childFolderIds: [],
          createdAt: now,
          updatedAt: now
        })
      )
      // Wait for next render cycle when root exists
      return
    }
    // Re-parent any top-level folders to root (excluding root itself)
    const topLevel = folders.filter((f) => (f.parentFolderId ?? null) === null && f.id !== ROOT_FOLDER_ID)
    for (const f of topLevel) {
      dispatch(
        foldersActions.updateFolder({
          ...f,
          parentFolderId: ROOT_FOLDER_ID,
          updatedAt: new Date().toISOString()
        })
      )
    }
    // Build topicId -> folderId map
    const topicToFolder = new Map<string, string>()
    for (const f of folders) {
      for (const id of f.topicIds || []) topicToFolder.set(id, f.id)
    }
    // Assign any unassigned topics to root
    const unassignedIds = sliceTopics.map((t) => t.id).filter((id) => !topicToFolder.has(id))
    if (unassignedIds.length) {
      dispatch(foldersActions.assignTopicsToFolder({ folderId: ROOT_FOLDER_ID, topicIds: unassignedIds }))
    }
    // Upsert topic.folderId for all topics that don't already have it
    const topicsNeedingFolderId = sliceTopics.filter((t) => !t.folderId)
    if (topicsNeedingFolderId.length) {
      const updatedTopics = topicsNeedingFolderId.map((t) => ({ ...t, folderId: topicToFolder.get(t.id) || ROOT_FOLDER_ID }))
      dispatch(topicsActions.upsertTopics(updatedTopics))
    }
  }, [dispatch, folders, sliceTopics])

  const handleSetActiveTopic = useCallback((topic: Topic) => {
    try {
      logger.info('Setting active topic (assistant-first)', {
        topicId: topic?.id,
        topicName: topic?.name,
        topicAssistantId: topic?.assistantId,
        prevTopicId: activeTopic?.id,
        prevAssistantId: activeAssistant?.id
      })
      // If topic belongs to a different assistant, switch assistant first
      if (topic?.assistantId && topic.assistantId !== activeAssistant?.id) {
        const targetAssistant = assistants.find((a) => a.id === topic.assistantId)
        if (targetAssistant) {
          setActiveAssistant(targetAssistant)
          logger.debug('Switched active assistant before topic switch', { assistantId: targetAssistant.id })
        } else {
          logger.warn('Assistant for topic not found, proceeding with topic activation', { assistantId: topic.assistantId })
        }
      }
      // Then set topic active
      setActiveTopic(topic)
    } catch (err) {
      logger.error('Failed to set active topic', { error: err, topicId: topic?.id })
    }
  }, [setActiveTopic, logger, activeTopic?.id, assistants, activeAssistant?.id, setActiveAssistant])

  const handleSetActiveAssistant = useCallback((assistant: Assistant) => {
    setActiveAssistant(assistant)
  }, [])

  const handleNewFolder = useCallback(
    (parentId?: string) => {
      // Only treat as folder parent if id matches an existing folder (ignore pseudo nodes like 'root-unassigned')
      const isValidParent = parentId && folders.some((f) => f.id === parentId)
      const now = new Date().toISOString()
      const id = nanoid()
      dispatch(
        foldersActions.addFolder({
          id,
          name: 'New Folder',
          parentFolderId: isValidParent ? parentId! : ROOT_FOLDER_ID,
          topicIds: [],
          childFolderIds: [],
          createdAt: now,
          updatedAt: now
        })
      )
    },
    [dispatch, folders]
  )

  const handleRename = useCallback((item: UITreeItem) => {
    if (item.type !== 'folder') return
    const f = folders.find((x) => x.id === item.id)
    if (!f) return
    const updated = { ...f, name: item.name, updatedAt: new Date().toISOString() }
    dispatch(foldersActions.updateFolder(updated))
  }, [dispatch, folders])

  const handleNewChat = useCallback(
    async (parentId?: string) => {
      try {
        // Ensure we have an assistant: prefer active, else default, else first
        const assistant = activeAssistant || assistants[0]
        if (!assistant) {
          logger.warn('No assistant available when creating new chat')
          return
        }
        const folderId = parentId && folders.some((f) => f.id === parentId) ? parentId : ROOT_FOLDER_ID
        logger.debug('Creating new topic', { assistantId: assistant.id, folderId })
        const topic = await createTopic(assistant.id, folderId)
        logger.info('New topic created', { topicId: topic.id, folderId })
        // Set as active
        setActiveTopic(topic)
        // Ensure the active assistant is set if it was empty
        if (!activeAssistant) {
          setActiveAssistant(assistant)
          logger.info('Active assistant set after new topic', { assistantId: assistant.id })
        }
      } catch (err) {
        logger.error('Failed to create or activate new topic', err as any)
      }
    },
    [activeAssistant, defaultAssistant, assistants, dispatch, folders, setActiveTopic, setActiveAssistant, logger]
  )

  // Note: do not listen to global Home events here to avoid duplicate creations

  const handleDelete = useCallback(
    (item: UITreeItem) => {
      if (item.type !== 'folder') return
      if (item.id === ROOT_FOLDER_ID) return // do not delete real root
      // collect this folder and all descendants
      const toDelete: string[] = []
      const queue: string[] = [item.id]
      while (queue.length) {
        const fid = queue.shift()!
        toDelete.push(fid)
        for (const f of folders) {
          if ((f.parentFolderId ?? null) === fid) queue.push(f.id)
        }
      }
      // Removing folders implicitly unassigns their topics
      dispatch(foldersActions.removeFoldersById(toDelete))
    },
    [dispatch, folders]
  )

  // Drag-and-drop handler from FolderTree
  const handleDropToFolder = useCallback((source: { type: 'folder' | 'chat'; id: string }, targetFolderId: string) => {
    const now = new Date().toISOString()
    const targetFolder = folders.find((f) => f.id === targetFolderId)
    if (!targetFolder) return

    if (source.type === 'chat') {
      const t = topicById.get(source.id)
      if (!t) return
      const prevFolderId = t.folderId || folders.find((f) => (f.topicIds || []).includes(t.id))?.id || ROOT_FOLDER_ID
      if (prevFolderId === targetFolderId) return
      // Move in folders slice and update topic.folderId
      dispatch(foldersActions.moveTopics({ sourceFolderId: prevFolderId, targetFolderId, topicIds: [t.id] }))
      dispatch(topicsActions.updateTopic({ ...t, folderId: targetFolderId, updatedAt: now }))
      return
    }

    if (source.type === 'folder') {
      const moving = folders.find((f) => f.id === source.id)
      if (!moving) return
      if (moving.id === ROOT_FOLDER_ID) return // do not reparent root
      if (moving.id === targetFolderId) return // no-op
      // Prevent moving into a descendant
      const isDescendant = (ancestorId: string, maybeDescendantId: string): boolean => {
        const stack = [ancestorId]
        while (stack.length) {
          const current = stack.pop()!
          const children = folders.filter((f) => (f.parentFolderId ?? null) === current).map((f) => f.id)
          if (children.includes(maybeDescendantId)) return true
          stack.push(...children)
        }
        return false
      }
      if (isDescendant(moving.id, targetFolderId)) return
      if (moving.parentFolderId === targetFolderId) return
      dispatch(foldersActions.updateFolder({ ...moving, parentFolderId: targetFolderId, updatedAt: now }))
      return
    }
  }, [dispatch, folders, topicById])

  if (!activeAssistant || !activeTopic) {
    return (
      <LoadingContainer>
        <Spinner />
        <div>Loading chat...</div>
      </LoadingContainer>
    )
  }

  return (
    <Container id="home-page">
      <ChattingNavbar
        activeAssistant={activeAssistant}
        activeTopic={activeTopic}
        setActiveTopic={handleSetActiveTopic}
        setActiveAssistant={handleSetActiveAssistant}
        position="left"
        onCreateTopic={() => handleNewChat()}
      />
      <ContentContainer id={isLeftNavbar ? 'content-container' : undefined}>
        {showAssistants && (
          <SidebarContainer>
            <FolderTree
              data={buildFolderTreeData()}
              onSelect={(item) => {
                try {
                  logger.debug('FolderTree onSelect', { item })
                  if (item.type === 'chat') {
                    const t = topicById.get(item.id)
                    if (t) {
                      logger.info('Topic selected from tree', { topicId: t.id, topicName: t.name })
                      handleSetActiveTopic(t)
                    } else {
                      logger.warn('Topic not found by id from tree', { topicId: item.id })
                    }
                  }
                } catch (err) {
                  logger.error('Error handling FolderTree onSelect', err as any)
                }
              }}
              onNewFolder={handleNewFolder}
              onNewChat={handleNewChat}
              onRename={handleRename}
              onDelete={handleDelete}
              onDropToFolder={handleDropToFolder}
              renderChatItem={(id) => {
                const t = topicById.get(id)
                if (!t || !activeAssistant) return null
                return (
                  <ChattingTopicItem
                    assistant={activeAssistant}
                    topic={t}
                    activeTopicId={activeTopic.id}
                    onSwitchTopic={handleSetActiveTopic}
                    showTime={showTopicTime}
                  />
                )
              }}
            />
          </SidebarContainer>
        )}
        <Chat 
          assistant={activeAssistant}
          activeTopic={activeTopic}
          setActiveTopic={handleSetActiveTopic}
          setActiveAssistant={handleSetActiveAssistant}
        />
      </ContentContainer>
    </Container>
  )
}

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
  color: var(--color-text-secondary);
  gap: 1rem;
`

const Spinner = styled.div`
  border: 4px solid var(--color-border);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
`

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  [navbar-position='left'] & {
    max-width: calc(100vw - var(--sidebar-width));
  }
  [navbar-position='top'] & {
    max-width: 100vw;
  }
`

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  overflow: hidden;
`

const SidebarContainer = styled.div`
  width: var(--assistants-width);
  height: 100%;
  overflow-y: auto;
  border-right: 0.5px solid var(--color-border);
`

export default ChattingPage
