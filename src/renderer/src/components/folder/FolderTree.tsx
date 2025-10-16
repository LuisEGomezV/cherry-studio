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
  // Optional custom renderer for chat items (topics). When provided, chat items will be rendered
  // using this function and will not use the default FolderTree item container or context menu.
  renderChatItem?: (topicId: string) => React.ReactNode;
  // Drag and drop: dropping either a folder or chat into a folder target
  onDropToFolder?: (source: { type: 'folder' | 'chat'; id: string }, targetFolderId: string) => void;
  // Drag and drop: dropping into the empty area should assign to root
  onDropToRoot?: (source: { type: 'folder' | 'chat'; id: string }) => void;
  // Drag and drop: reordering items within the same parent
  onReorder?: (source: { type: 'folder' | 'chat'; id: string }, target: { type: 'folder' | 'chat'; id: string }, position: 'before' | 'after', parentId?: string) => void;
  // Optional: controlled open/closed state handler. If provided, component will not manage open state internally.
  onToggleFolder?: (id: string, open: boolean) => void;
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
  renderChatItem,
  onDropToFolder,
  onDropToRoot,
  onReorder,
  onToggleFolder,
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<FolderItem[]>(data);
  const [contextMenuTarget, setContextMenuTarget] = useState<FolderItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ itemId: string; position: 'before' | 'after' } | null>(null);
  const [folderDropTarget, setFolderDropTarget] = useState<string | null>(null);

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
      if (onToggleFolder) {
        const currentlyOpen = !!item.isOpen;
        onToggleFolder(item.id, !currentlyOpen);
      } else {
        // fallback to internal state management for backward compatibility
        toggleFolder(item.id);
      }
    }
    onSelect?.(item);
  };

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

  // Drag & Drop helpers
  const DRAG_MIME = 'application/x-folder-tree-item';

  const handleDragStart = useCallback((e: React.DragEvent, item: FolderItem) => {
    e.stopPropagation();
    try {
      const payload = JSON.stringify({ type: item.type === 'folder' ? 'folder' : 'chat', id: item.id });
      e.dataTransfer.setData(DRAG_MIME, payload);
      // Fallback for environments that filter custom MIME types
      e.dataTransfer.setData('text/plain', payload);
    } catch {}
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOverItem = useCallback((e: React.DragEvent, item: FolderItem) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const height = rect.height;
    
    // Use fixed 12px edge zones for consistent, predictable behavior
    const EDGE_SIZE = 12;
    
    if (item.type === 'folder') {
      // For folders: top edge = before, bottom edge = after, middle = drop into
      if (relativeY < EDGE_SIZE) {
        setDropIndicator({ itemId: item.id, position: 'before' });
        setFolderDropTarget(null);
      } else if (relativeY > height - EDGE_SIZE) {
        setDropIndicator({ itemId: item.id, position: 'after' });
        setFolderDropTarget(null);
      } else {
        // Middle zone - drop into folder
        setDropIndicator(null);
        setFolderDropTarget(item.id);
      }
    } else {
      // For topics: simple top/bottom split
      if (relativeY < height / 2) {
        setDropIndicator({ itemId: item.id, position: 'before' });
      } else {
        setDropIndicator({ itemId: item.id, position: 'after' });
      }
      setFolderDropTarget(null);
    }
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the entire tree area
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropIndicator(null);
      setFolderDropTarget(null);
    }
  }, []);

  const handleDropOnItem = useCallback((e: React.DragEvent, target: FolderItem, parentId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropIndicator(null);
    setFolderDropTarget(null);
    
    try {
      const raw = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const payload = JSON.parse(raw) as { type: 'folder' | 'chat'; id: string };
      
      // Don't drop on self
      if (payload.id === target.id) return;
      
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const height = rect.height;
      
      const EDGE_SIZE = 12;
      
      // For folders: check if dropping in middle zone (move into folder)
      if (target.type === 'folder') {
        if (relativeY >= EDGE_SIZE && relativeY <= height - EDGE_SIZE) {
          // Middle zone - move into folder
          onDropToFolder?.(payload, target.id);
          return;
        }
      }
      
      // Otherwise, treat as reordering (with potential cross-folder move)
      if (onReorder) {
        const position = relativeY < height / 2 ? 'before' : 'after';
        const targetInfo = { type: target.type === 'folder' ? 'folder' as const : 'chat' as const, id: target.id };
        onReorder(payload, targetInfo, position, parentId);
      }
    } catch {}
  }, [onDropToFolder, onReorder]);

  const handleDragOverRoot = useCallback((e: React.DragEvent) => {
    // Allow dropping anywhere within the container that isn't handled by children
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropOnRoot = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropIndicator(null);
    try {
      const raw = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const payload = JSON.parse(raw) as { type: 'folder' | 'chat'; id: string };
      onDropToRoot?.(payload);
    } catch {}
  }, [onDropToRoot]);
  
  const handleDragEnd = useCallback(() => {
    setDropIndicator(null);
    setFolderDropTarget(null);
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

  const renderTree = (items: FolderItem[], currentLevel: number, parentId?: string) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isFolder = item.type === 'folder';
      const isSelected = selectedId === item.id;
      const isOpen = !!item.isOpen; // Default to closed if not specified
      const showDropBefore = dropIndicator?.itemId === item.id && dropIndicator?.position === 'before';
      const showDropAfter = dropIndicator?.itemId === item.id && dropIndicator?.position === 'after';
      const isFolderDropTarget = isFolder && folderDropTarget === item.id;

      // If this is a chat item and a custom renderer is provided, render it directly
      // without FolderTree's default container and context menu.
      if (item.type === 'chat' && renderChatItem) {
        return (
          <div key={item.id} style={{ position: 'relative' }}>
            {showDropBefore && <DropIndicator />}
            <ChatItemContainer
              $level={currentLevel}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOverItem(e, item)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropOnItem(e, item, parentId)}
              onDragEnd={handleDragEnd}
            >
              {renderChatItem(item.id)}
            </ChatItemContainer>
            {showDropAfter && <DropIndicator />}
          </div>
        );
      }

      return (
        <div key={item.id} style={{ position: 'relative' }}>
          {showDropBefore && <DropIndicator />}
          <Dropdown 
            menu={{ items: menuItems, onClick: handleMenuClick }}
            trigger={['contextMenu']}
            open={contextMenuTarget?.id === item.id}
            onOpenChange={(open) => !open && setContextMenuTarget(null)}
          >
            <FolderItemContainer
              $level={currentLevel}
              $isSelected={isSelected}
              $isDropTarget={isFolderDropTarget}
              onClick={(e) => handleItemClick(e, item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOverItem(e, item)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropOnItem(e, item, parentId)}
              onDragEnd={handleDragEnd}
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
          {showDropAfter && !isOpen && <DropIndicator />}
          {isFolder && isOpen && hasChildren && (
            <ChildrenContainer $level={currentLevel}>
              {renderTree(item.children || [], currentLevel + 1, item.id)}
            </ChildrenContainer>
          )}
          {showDropAfter && isOpen && <DropIndicator />}
        </div>
      );
    });
  };

  return <Container onDragEnter={handleDragOverRoot} onDragOver={handleDragOverRoot} onDrop={handleDropOnRoot}>{renderTree(items, level)}</Container>;
};

export default FolderTree;

const Container = styled.div`
  user-select: none;
  width: 100%;
  min-height: 100%;
`;

const FolderItemContainer = styled.div<{ $level: number; $isSelected: boolean; $isDropTarget?: boolean }>`
  display: flex;
  align-items: center;
  padding: 6px 8px 6px ${(props) => 8 + props.$level * 16}px;
  margin: 2px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--color-text);
  background-color: ${(props) =>
    props.$isDropTarget
      ? 'var(--color-primary-mute)'
      : props.$isSelected
      ? 'var(--color-primary-light)'
      : 'transparent'};

  &:hover {
    background-color: ${(props) =>
      props.$isDropTarget ? 'var(--color-primary-mute)' : 'var(--color-bg-hover)'};
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

const ChildrenContainer = styled.div<{ $level: number }>`
  position: relative;
  overflow: hidden;

  /* Vertical guide line that wraps the children of a folder */
  &::before {
    content: '';
    position: absolute;
    top: 2px;
    bottom: 2px;
    /* Align the guide roughly within the next-level indent gutter */
    left: ${(props) => 8 + props.$level * 16 + 10}px;
    width: 2px;
    background: var(--color-primary);
    opacity: 0.35;
    pointer-events: none;
    /* Make the line slightly thinner than 2px while staying crisper than 1px */
    transform: scaleX(0.7);
    transform-origin: left;
    will-change: transform;
  }
`;

const ChatItemContainer = styled.div<{ $level: number }>`
  padding: 6px 8px 6px ${(props) => 8 + props.$level * 16}px;
  margin: 0px 0;
  /* Slightly overlap consecutive items to reduce the empty space between them */
  & + & {
    margin-top: -2px;
  }
`;

const DropIndicator = styled.div`
  height: 2px;
  background: var(--color-primary);
  border-radius: 1px;
  pointer-events: none;
  position: absolute;
  left: 8px;
  right: 8px;
  top: -2px;
  
  &::before {
    content: '';
    position: absolute;
    left: -4px;
    top: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-primary);
  }
`;
