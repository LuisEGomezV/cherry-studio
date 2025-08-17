import { DeleteIcon } from './Icons';
import { Topic } from '../types';
import { MessageSquare, XIcon } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const TopicListItemContainer = styled.div`
  padding: 7px 12px;
  border-radius: var(--list-item-border-radius);
  font-size: 13px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  position: relative;
  cursor: pointer;

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
  align-items: center;
  gap: 8px;
  overflow: hidden;
`;

const TopicName = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MenuButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 20px;
  border-radius: 4px;
  &:hover {
    background-color: var(--color-background-mute);
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
    isActive: boolean;
    onSelect: (topic: Topic) => void;
    onDelete: (topic: Topic) => void;
    onRename: (topic: Topic, newName: string) => void;
}

const TopicListItem: React.FC<TopicItemProps> = ({ topic, isActive, onSelect, onDelete, onRename }) => {
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
        setEditingName(topic.name);
    }, [topic.name]);

    useEffect(() => {
      return () => {
        if (deleteTimerRef.current) {
          clearTimeout(deleteTimerRef.current);
        }
      };
    }, []);

    const handleDoubleClick = () => {
        setIsEditing(true);
    }

    return (
        <TopicListItemContainer
            className={isActive ? 'active' : ''}
            onClick={() => onSelect(topic)}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setIsConfirmingDelete(false);
                if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
            }}
        >
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
                    <TopicNameContainer>
                        <MessageSquare size={16} />
                        <TopicName>{topic.name}</TopicName>
                    </TopicNameContainer>
                    {isHovered && (
                        <MenuButton className="menu" onClick={handleDeleteClick}>
                            {isConfirmingDelete ? (
                                <DeleteIcon size={14} color="var(--color-error)" />
                            ) : (
                                <XIcon size={14} color="var(--color-text-3)" />
                            )}
                        </MenuButton>
                    )}
                </>
            )}
        </TopicListItemContainer>
    );
}

export default TopicListItem;
