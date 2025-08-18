import { useAssistants } from '@renderer/hooks/useAssistant'
import { useActiveTopic } from '@renderer/hooks/useTopic'
import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, SECOND_MIN_WINDOW_WIDTH } from '@shared/config/constant'
import { Assistant, Topic } from '@renderer/types'
import { FC, useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'

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

  if (!activeAssistant || !activeTopic) {
    return (
      <LoadingContainer>
        <Spinner />
        <div>Loading chat...</div>
      </LoadingContainer>
    )
  }

  return (
    <Container>
      {/* Empty left side as per requirements */}
      <EmptySidebar />
      
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
  flex-direction: row;
  overflow: hidden;
  min-width: ${MIN_WINDOW_WIDTH}px;
  min-height: ${MIN_WINDOW_HEIGHT}px;
  background-color: var(--color-bg);
`

const EmptySidebar = styled.div`
  width: 0;
  border-right: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
  transition: width 0.2s ease;
  overflow: hidden;
`

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: ${SECOND_MIN_WINDOW_WIDTH}px;
  height: 100vh;
  overflow: hidden;
`

const ChatContainer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`

export default ChattingPage
