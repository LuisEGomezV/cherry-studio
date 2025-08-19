import { useAssistants } from '@renderer/hooks/useAssistant'
import { useActiveTopic } from '@renderer/hooks/useTopic'
import { useNavbarPosition } from '@renderer/hooks/useSettings'
import { useShowAssistants } from '@renderer/hooks/useStore'
import { Assistant, Topic } from '@renderer/types'
import { mockFolders } from '@renderer/mocks/folderData'
import { FC, useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import Navbar from '../home/Navbar'
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
      {isLeftNavbar && (
        <Navbar 
          activeAssistant={activeAssistant}
          activeTopic={activeTopic}
          setActiveTopic={handleSetActiveTopic}
          setActiveAssistant={handleSetActiveAssistant}
          position="left"
        />
      )}
      <ContentContainer id={isLeftNavbar ? 'content-container' : undefined}>
        {showAssistants && (
          <SidebarContainer>
            <FolderTree 
              data={mockFolders}
              onSelect={(item) => {
                console.log('Selected item:', item);
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
