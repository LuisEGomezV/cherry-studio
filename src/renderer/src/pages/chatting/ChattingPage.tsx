import { useAssistants } from '@renderer/hooks/useAssistant'
import { useActiveTopic } from '@renderer/hooks/useTopic'
import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, SECOND_MIN_WINDOW_WIDTH } from '@shared/config/constant'
import { Assistant, Topic } from '@renderer/types'
import { FC, useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Folder } from 'lucide-react'
import FolderTree from '../../components/folder/FolderTree'
import { mockFolders } from '../../mocks/folderData'
import Navbar from '../home/Navbar'

import Chat from '../home/Chat'

const ChattingPage: FC = () => {
  const { assistants } = useAssistants()
  const location = useLocation()
  const state = location.state as { assistant?: Assistant; topic?: Topic } | undefined

  const [activeAssistant, setActiveAssistant] = useState<Assistant | undefined>(
    state?.assistant || (assistants.length > 0 ? assistants[0] : undefined)
  )
  const { activeTopic, setActiveTopic } = useActiveTopic(activeAssistant?.id || '', state?.topic)

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

  const handleSelectItem = useCallback((item: any) => {
    console.log('Selected item:', item)
    // Handle item selection (e.g., load chat, navigate to folder)
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
    <PageContainer>
      <Navbar 
        activeAssistant={activeAssistant}
        activeTopic={activeTopic}
        setActiveTopic={handleSetActiveTopic}
        setActiveAssistant={handleSetActiveAssistant}
        position="left"
      />
      
      <MainContainer>
        {/* Left sidebar with folder tree */}
        <Sidebar>
          <SidebarHeader>
            <Folder size={16} />
            <SidebarTitle>Folders</SidebarTitle>
          </SidebarHeader>
          <FolderTreeContainer>
            <FolderTree 
              data={mockFolders} 
              onSelect={handleSelectItem}
              selectedId={activeTopic?.id}
            />
          </FolderTreeContainer>
        </Sidebar>
        
        {/* Main content area */}
        <MainContent>
          <ChatContainer>
            <Chat 
              assistant={activeAssistant}
              activeTopic={activeTopic}
              setActiveTopic={handleSetActiveTopic}
              setActiveAssistant={handleSetActiveAssistant}
            />
          </ChatContainer>
        </MainContent>
      </MainContainer>
    </PageContainer>
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

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  min-width: ${MIN_WINDOW_WIDTH}px;
  min-height: ${MIN_WINDOW_HEIGHT}px;
  background-color: var(--color-bg);
`

const MainContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  overflow: hidden;
  height: calc(100vh - var(--navbar-height));
`

const Sidebar = styled.div`
  width: 240px;
  min-width: 240px;
  border-right: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
  color: var(--color-text);
  gap: 8px;
`

const SidebarTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
`

const FolderTreeContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px;
`

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: ${SECOND_MIN_WINDOW_WIDTH}px;
  overflow: hidden;
`

const ChatContainer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`

export default ChattingPage
