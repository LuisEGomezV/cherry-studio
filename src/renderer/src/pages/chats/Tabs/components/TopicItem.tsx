import { DeleteIcon } from '@renderer/components/Icons';
import { Topic } from '@renderer/types';
import { MessageSquare, XIcon } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const TopicListItem = styled.div`
  padding: 7px 12px;
  border-radius: var(--list-item-border-radius);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  cursor: pointer;
  position: relative;
  width: calc(var(--assistants-width) - 20px);
  .menu {
    opacity: 0;
    color: var(--color-text-3);
  }
  &:hover {
    background-color: var(--color-list-item-hover);
    transition: background-color 0.1s;
    .menu {
      opacity: 1;
    }
  }
  &.active {
    background-color: var(--color-list-item);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    .menu {
      opacity: 1;
      &:hover {
        color: var(--color-text-2);
      }
    }
  }
`;

const TopicNameContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  justify-content: space-between;
`;

const TopicName = styled.div`
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
  position: relative;
  will-change: background-position, width;
`;

const MenuButton = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
  .anticon {
    font-size: 12px;
  }
`;

const TopicEditInput = styled.input`
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-1);
  font-size: 13px;
  font-family: inherit;
  padding: 2px 6px;
  width: 100%;
  outline: none;

  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-alpha);
  }
`;

interface TopicItemProps {
    topic: Topic;
    onSelect: (topic: Topic) => void;
    onDelete: (topic: Topic) => void;
    onRename: (topic: Topic, newName: string) => void;
    isActive: boolean;
}

const TopicItem: React.FC<TopicItemProps> = ({ topic, onSelect, onDelete, onRename, isActive }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingName, setEditingName] = useState(topic.name);
    const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isConfirmingDelete) {
        onDelete(topic);
      } else {
        setIsConfirmingDelete(true);
        deleteTimerRef.current = setTimeout(() => {
          setIsConfirmingDelete(false);
        }, 2000);
      }
    };

    const handleRename = () => {
      if (editingName.trim() && editingName.trim() !== topic.name) {
        onRename(topic, editingName.trim());
      }
      setIsEditing(false);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleRename();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditingName(topic.name);
      }
    };

    useEffect(() => {
      return () => {
        if (deleteTimerRef.current) {
          clearTimeout(deleteTimerRef.current);
        }
      };
    }, []);

    return (
        <TopicListItem
            className={isActive ? 'active' : ''}
            onClick={() => onSelect(topic)}
            onDoubleClick={() => setIsEditing(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setIsConfirmingDelete(false);
                if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
            }}
        >
            <TopicNameContainer>
                {isEditing ? (
                    <TopicEditInput
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={handleRename}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <MessageSquare size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }}/>
                            <TopicName>{topic.name}</TopicName>
                        </div>
                        <MenuButton className="menu" onClick={handleDeleteClick}>
                            {isConfirmingDelete ? (
                                <DeleteIcon size={14} color="var(--color-error)" />
                            ) : (
                                <XIcon size={14} color="var(--color-text-3)" />
                            )}
                        </MenuButton>
                    </>
                )}
            </TopicNameContainer>
        </TopicListItem>
    );
}

export default TopicItem;
