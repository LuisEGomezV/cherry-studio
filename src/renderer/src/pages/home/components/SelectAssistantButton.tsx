import ModelAvatar from '@renderer/components/Avatar/ModelAvatar'
import EmojiIcon from '@renderer/components/EmojiIcon'
import { useAssistant } from '@renderer/hooks/useAssistant'
import { useSettings } from '@renderer/hooks/useSettings'
import { getDefaultModel } from '@renderer/services/AssistantService'
import { Assistant, Topic } from '@renderer/types'
import { getLeadingEmoji } from '@renderer/utils'
import { Button } from 'antd'
import { ChevronsUpDown } from 'lucide-react'
import { FC, useMemo } from 'react'
import styled from 'styled-components'
import SelectAssistantPopup from '@renderer/components/Popups/SelectAssistantPopup'

interface Props {
  assistant: Assistant
  activeTopic: Topic
  setActiveAssistant: (assistant: Assistant) => void
  setActiveTopic: (topic: Topic) => void
}

const SelectAssistantButton: FC<Props> = ({ assistant, activeTopic, setActiveAssistant, setActiveTopic }) => {
  const { moveTopic } = useAssistant(assistant.id)
  const { assistantIconType } = useSettings()
  const defaultModel = getDefaultModel()

  const assistantName = useMemo(() => assistant.name || 'Assistant', [assistant.name])
  const fullAssistantName = useMemo(
    () => (assistant.emoji ? `${assistant.emoji} ${assistantName}` : assistantName),
    [assistant.emoji, assistantName]
  )

  const onSelect = async (selected: Assistant) => {
    if (!activeTopic || !selected || selected.id === assistant.id) return
    // Move the topic to the selected assistant, update DB + redux
    moveTopic(activeTopic, selected)
    // Update local active states
    setActiveAssistant(selected)
    setActiveTopic({ ...activeTopic, assistantId: selected.id })
  }

  return (
    <DropdownButton
      size="small"
      type="text"
      onClick={async (e) => {
        ;(e.currentTarget as HTMLElement).blur()
        const selected = await SelectAssistantPopup.show({ currentAssistantId: assistant.id })
        if (selected) {
          onSelect(selected)
        }
      }}
    >
      <ButtonContent>
        {assistantIconType === 'model' ? (
          <ModelAvatar model={assistant.model || defaultModel} size={20} />
        ) : assistantIconType === 'emoji' ? (
          <EmojiIcon emoji={assistant.emoji || getLeadingEmoji(assistant.name)} />
        ) : null}
        <AssistantName title={fullAssistantName}>{fullAssistantName}</AssistantName>
      </ButtonContent>
      <ChevronsUpDown size={14} color="var(--color-icon)" />
    </DropdownButton>
  )
}

const DropdownButton = styled(Button)`
  font-size: 11px;
  border-radius: 15px;
  padding: 13px 5px;
  -webkit-app-region: none;
  box-shadow: none;
  background-color: transparent;
  border: 1px solid transparent;
  margin-top: 1px;
`

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const AssistantName = styled.span`
  font-weight: 500;
  margin-right: -2px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

// Old Dropdown menu styles removed since we now use a centered popup

export default SelectAssistantButton
