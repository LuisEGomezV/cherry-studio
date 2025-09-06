import { useMemo } from 'react'
import { useAppSelector } from '@renderer/store'
import { selectAssistantTopics } from '@renderer/store/topics'
import { Assistant, Topic } from '@renderer/types'

/**
 * Hook to get topics for an assistant by ID using normalized state.
 * Falls back to nested assistant.topics during migration.
 */
export function useAssistantTopics(assistantId: string): Topic[] {
  const assistant: Assistant | undefined = useAppSelector((s) =>
    s.assistants.assistants.find((a) => a.id === assistantId)
  )
  const normalized = useAppSelector((s) => selectAssistantTopics(s, assistantId))

  return useMemo(() => {
    if (normalized?.length) return normalized
    return assistant?.topics ?? []
  }, [assistant?.topics, normalized])
}
