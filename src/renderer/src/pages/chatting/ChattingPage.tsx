import { useAssistants } from '@renderer/hooks/useAssistant'
import { useActiveTopic } from '@renderer/hooks/useTopic'
import { useNavbarPosition } from '@renderer/hooks/useSettings'
import { useShowAssistants } from '@renderer/hooks/useStore'
import { Assistant, Topic } from '@renderer/types'
import { useAppSelector } from '@renderer/store'
import { selectAllFolders, selectUnassignedTopics } from '@renderer/store/folders'
import { selectAllTopics } from '@renderer/store/topics'
import type { FolderItem as UITreeItem } from '@renderer/types/folder'
import { FC, useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import ChattingNavbar from './ChattingNavbar'
import Chat from '../home/Chat'
import FolderTree from '../../components/folder/FolderTree'

const ChattingPage: FC = () => {
  const { assistants } = useAssistants()
  const location = useLocation()
  const state = location.state as { assistant?: Assistant; topic?: Topic } | undefined
  const { isLeftNavbar } = useNavbarPosition()
  const { showAssistants } = useShowAssistants()

  const [activeAssistant, setActiveAssistant] = useState<Assistant | undefined>(
    state?.assistant || (assistants.length > 0 ? assistants[0] : undefined)
  )
  const { activeTopic, setActiveTopic } = useActiveTopic(activeAssistant?.id || '', state?.topic)

  // Real folders and topics from store
  const folders = useAppSelector(selectAllFolders)
  const sliceTopics = useAppSelector(selectAllTopics)
  const unassignedTopicsFromSelector = useAppSelector(selectUnassignedTopics)

  // Fallback: if topics slice is empty, use topics from assistants (legacy path)
  const allAssistantTopics = assistants.flatMap((a) => a.topics || [])
  const hasSliceTopics = !!(sliceTopics && sliceTopics.length > 0)
  const allTopics = hasSliceTopics ? sliceTopics : allAssistantTopics
  const topicById = new Map(allTopics.map((t) => [t.id, t]))

  const buildFolderTreeData = useCallback((): UITreeItem[] => {
    const byParent = new Map<string | null, typeof folders>()
    for (const f of folders) {
      const key = f.parentFolderId ?? null
      const arr = byParent.get(key) || []
      arr.push(f)
      byParent.set(key, arr)
    }

    const makeNode = (folderId: string): UITreeItem | null => {
      const f = folders.find((x) => x.id === folderId)
      if (!f) return null
      const childFolders = (byParent.get(f.id) || []).map((cf) => makeNode(cf.id)).filter(Boolean) as UITreeItem[]
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

    const roots = (byParent.get(null) || []).map((rf) => makeNode(rf.id)).filter(Boolean) as UITreeItem[]

    // Compute unassigned topics:
    // - If no folders exist yet, treat all topics as unassigned
    // - If folders exist but topics slice is empty (using assistant fallback), compute unassigned by excluding assigned IDs
    const hasAnyFolders = folders.length > 0
    let unassigned = allTopics
    if (hasAnyFolders) {
      if (hasSliceTopics) {
        unassigned = unassignedTopicsFromSelector
      } else {
        const assignedIdSet = new Set<string>()
        for (const f of folders) for (const id of f.topicIds || []) assignedIdSet.add(id)
        unassigned = allTopics.filter((t) => !assignedIdSet.has(t.id))
      }
    }

    // Pseudo node for unassigned topics (backend root is invisible; UI needs a place to click them)
    const unassignedNode: UITreeItem | null = unassigned.length
      ? {
          id: 'root-unassigned',
          name: 'Unassigned',
          type: 'folder',
          isOpen: true,
          children: unassigned.map((t) => ({ id: t.id, name: t.name, type: 'chat' as const }))
        }
      : null

    return unassignedNode ? [unassignedNode, ...roots] : roots
  }, [folders, allTopics, unassignedTopicsFromSelector, topicById, hasSliceTopics])

  // Handle any necessary side effects
  useEffect(() => {
    if (assistants.length > 0 && !activeAssistant) {
      setActiveAssistant(assistants[0])
    }
  }, [assistants, activeAssistant])

  const handleSetActiveTopic = useCallback((topic: Topic) => {
    setActiveTopic(topic)
  }, [setActiveTopic])

  const handleSetActiveAssistant = useCallback((assistant: Assistant) => {
    setActiveAssistant(assistant)
  }, [])


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
      />
      <ContentContainer id={isLeftNavbar ? 'content-container' : undefined}>
        {showAssistants && (
          <SidebarContainer>
            <FolderTree
              data={buildFolderTreeData()}
              onSelect={(item) => {
                if (item.type === 'chat') {
                  const t = topicById.get(item.id)
                  if (t) setActiveTopic(t)
                }
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
