import { ChevronDown, ChevronRight, Folder, MessageSquare, Archive, FolderOpen, Trash2, Pencil, MessageSquarePlus, FolderPlus } from 'lucide-react';
import { FC, useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FolderItem } from '../../types/folder';
import { Dropdown } from 'antd';
import { useTranslation } from 'react-i18next';

interface FolderTreeProps {
  data: FolderItem[];
  onSelect?: (item: FolderItem) => void;
  onNewChat?: (parentId?: string) => void;
  onNewFolder?: (parentId?: string) => void;
  onRename?: (item: FolderItem) => void;
  onDelete?: (item: FolderItem) => void;
  selectedId?: string;
  level?: number;
}

const getIcon = (type: string, isOpen?: boolean) => {
  switch (type) {
    case 'folder':
      return isOpen ? <FolderOpen size={16} /> : <Folder size={16} />;
    case 'chat':
      return <MessageSquare size={16} />;
    case 'archive':
      return <Archive size={16} />;
    default:
      return null;
  }
};

const FolderTree: FC<FolderTreeProps> = ({
  data,
  onSelect,
  onNewChat,
  onNewFolder,
  onRename,
  onDelete,
  selectedId,
  level = 0,
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<FolderItem[]>(data);
  const [contextMenuTarget, setContextMenuTarget] = useState<FolderItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep internal state in sync with external data updates
  useEffect(() => {
    setItems(data);
  }, [data]);

  const toggleFolder = (id: string) => {
    const updateItems = (items: FolderItem[]): FolderItem[] => {
      return items.map((item) => {
        if (item.id === id) {
          return { ...item, isOpen: !item.isOpen };
        }
        if (item.children) {
          return { ...item, children: updateItems(item.children) };
        }
        return item;
      });
    };

    setItems(updateItems(items));
  };

  const handleItemClick = (e: React.MouseEvent, item: FolderItem) => {
    e.stopPropagation();
    if (item.type === 'folder') {
      toggleFolder(item.id);
    }
    onSelect?.(item);  };

  const handleContextMenu = useCallback((e: React.MouseEvent, item: FolderItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuTarget(item);
  }, []);

  const handleMenuClick = useCallback(({ key, domEvent }: { key: string, domEvent: { stopPropagation: () => void } }) => {
    domEvent.stopPropagation();
    if (!contextMenuTarget) return;

    switch (key) {
      case 'new-chat':
        onNewChat?.(contextMenuTarget.id);
        break;
      case 'new-folder':
        onNewFolder?.(contextMenuTarget.id);
        break;
      case 'rename':
        // Start inline editing for folders only
        if (contextMenuTarget.type === 'folder') {
          setEditingId(contextMenuTarget.id);
          setEditValue(contextMenuTarget.name || '');
          // focus handled in effect below
        } else {
          onRename?.(contextMenuTarget);
        }
        break;
      case 'delete':
        onDelete?.(contextMenuTarget);
        break;
    }
    setContextMenuTarget(null);
  }, [contextMenuTarget, onNewChat, onNewFolder, onRename, onDelete]);

  // Focus input when entering edit mode
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    if (editingId) {
      // slight delay to ensure input rendered
      t = setTimeout(() => inputRef.current?.focus(), 0)
    }
    return () => {
      if (t) clearTimeout(t)
    }
  }, [editingId])

  const commitRename = useCallback((item: FolderItem) => {
    const name = editValue.trim();
    if (name && name !== item.name) {
      onRename?.({ ...item, name });
    }
    setEditingId(null);
    setEditValue('');
  }, [editValue, onRename]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const menuItems = [
    {
      key: 'new-chat',
      label: t('chat.topics.new'),
      icon: <MessageSquarePlus size={14} />,
    },
    {
      key: 'new-folder',
      label: t('chat.folder.new'),
      icon: <FolderPlus size={14} />,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'rename',
      label: t('chat.topics.edit.title'),
      icon: <Pencil size={14} />,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      label: t('common.delete'),
      danger: true,
      icon: <Trash2 size={14} style={{ color: 'inherit' }} />,
    },
  ];

  const renderTree = (items: FolderItem[], currentLevel: number) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isFolder = item.type === 'folder';
      const isSelected = selectedId === item.id;
      const isOpen = item.isOpen !== false; // Default to open if not specified

      return (
        <div key={item.id}>
          <Dropdown 
            menu={{ items: menuItems, onClick: handleMenuClick }}
            trigger={['contextMenu']}
            open={contextMenuTarget?.id === item.id}
            onOpenChange={(open) => !open && setContextMenuTarget(null)}
          >
            <FolderItemContainer
              $level={currentLevel}
              $isSelected={isSelected}
              onClick={(e) => handleItemClick(e, item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
            >
            <FolderItemContent>
              {isFolder && hasChildren ? (
                <ChevronWrapper>
                  {isOpen ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </ChevronWrapper>
              ) : (
                <ChevronPlaceholder />
              )}
              <IconWrapper>
                {getIcon(item.type, isFolder && isOpen)}
              </IconWrapper>
              {editingId === item.id && isFolder ? (
                <FolderEditInput
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(item);
                    if (e.key === 'Escape') cancelRename();
                  }}
                  onBlur={() => commitRename(item)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <FolderName>{item.name}</FolderName>
              )}
            </FolderItemContent>
            </FolderItemContainer>
          </Dropdown>
          {isFolder && isOpen && hasChildren && (
            <ChildrenContainer>
              {renderTree(item.children || [], currentLevel + 1)}
            </ChildrenContainer>
          )}
        </div>
      );
    });
  };

  return <Container>{renderTree(items, level)}</Container>;
};

export default FolderTree;

const Container = styled.div`
  user-select: none;
  width: 100%;
`;

const FolderItemContainer = styled.div<{ $level: number; $isSelected: boolean }>`
  display: flex;
  align-items: center;
  padding: 6px 8px 6px ${(props) => 8 + props.$level * 16}px;
  margin: 2px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--color-text);
  background-color: ${(props) =>
    props.$isSelected ? 'var(--color-primary-light)' : 'transparent'};

  &:hover {
    background-color: var(--color-bg-hover);
  }
`;

const FolderItemContent = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChevronWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  color: var(--color-text-secondary);
`;

const ChevronPlaceholder = styled.div`
  width: 20px;
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  color: var(--color-text-secondary);
`;

const FolderName = styled.span`
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FolderEditInput = styled.input`
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

const ChildrenContainer = styled.div`
  overflow: hidden;
`;
