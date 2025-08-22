import ModelAvatar from '@renderer/components/Avatar/ModelAvatar'
import EmojiIcon from '@renderer/components/EmojiIcon'
import { TopView } from '@renderer/components/TopView'
import { useAssistants } from '@renderer/hooks/useAssistant'
import { useSettings } from '@renderer/hooks/useSettings'
import { Assistant } from '@renderer/types'
import { getLeadingEmoji } from '@renderer/utils'
import { Input, Modal } from 'antd'
import { Search } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { getDefaultModel } from '@renderer/services/AssistantService'

interface PopupParams {
  currentAssistantId?: string
}

interface Props extends PopupParams {
  resolve: (value: Assistant | undefined) => void
}

const ITEM_HEIGHT = 44

const PopupContainer: React.FC<Props> = ({ currentAssistantId, resolve }) => {
  const { assistants } = useAssistants()
  const { assistantIconType } = useSettings()
  const [open, setOpen] = useState(true)
  const [searchText, setSearchText] = useState('')

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return assistants
    return assistants.filter((a) => `${a.emoji ?? ''} ${a.name}`.toLowerCase().includes(q))
  }, [assistants, searchText])

  const onCancel = useCallback(() => setOpen(false), [])
  const onAfterClose = useCallback(() => {
    resolve(undefined)
    SelectAssistantPopup.hide()
  }, [resolve])

  const handleSelect = useCallback(
    (a: Assistant) => {
      resolve(a)
      setOpen(false)
    },
    [resolve]
  )

  // keyboard: Enter selects first match, Esc closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        resolve(undefined)
      } else if (e.key === 'Enter') {
        if (filtered.length > 0) {
          handleSelect(filtered[0])
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, handleSelect, open, resolve])

  return (
    <Modal
      centered
      open={open}
      onCancel={onCancel}
      afterClose={onAfterClose}
      width={600}
      transitionName="animation-move-down"
      styles={{
        content: { borderRadius: 20, padding: 0, overflow: 'hidden', paddingBottom: 12 },
        body: { maxHeight: 'inherit', padding: 0 }
      }}
      closeIcon={null}
      footer={null}
    >
      <SearchRow>
        <Search className="icon" size={16} />
        <Input
          autoFocus
          bordered={false}
          placeholder="Search assistants..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </SearchRow>

      <List>
        {filtered.map((a) => {
          const isSelected = a.id === currentAssistantId
          return (
            <Item key={a.id} className={isSelected ? 'selected' : ''} onClick={() => handleSelect(a)}>
              <Left>
                {assistantIconType === 'model' ? (
                  <ModelAvatar model={a.model || getDefaultModel()} size={22} />
                ) : assistantIconType === 'emoji' ? (
                  <EmojiIcon emoji={a.emoji || getLeadingEmoji(a.name)} />
                ) : null}
                <Name title={a.name}>{a.name}</Name>
              </Left>
            </Item>
          )
        })}
      </List>

      <FooterRow>
        <FooterButton
          onClick={() => {
            // No-op for now as requested
          }}
        >
          Assistant settings
        </FooterButton>
      </FooterRow>
    </Modal>
  )
}

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 6px 14px;
  .icon {
    color: var(--color-text-3);
  }
  .ant-input {
    background: transparent;
    color: var(--color-text);
  }
`

const List = styled.div`
  max-height: 420px;
  overflow: auto;
  padding: 6px 6px 0 6px;
`

const Item = styled.div`
  height: ${ITEM_HEIGHT}px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  margin: 4px 6px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  &.selected {
    background-color: var(--color-background-mute);
  }
  &:hover {
    background-color: var(--color-background-mute);
  }
`

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  overflow: hidden;
`

const Name = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`

const FooterRow = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px 12px 12px;
`

const FooterButton = styled.div`
  -webkit-app-region: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  &:hover {
    background: var(--color-background-mute);
  }
`

const TopViewKey = 'SelectAssistantPopup'

export class SelectAssistantPopup {
  static topviewId = 0
  static hide() {
    TopView.hide(TopViewKey)
  }
}

export default PopupContainer
