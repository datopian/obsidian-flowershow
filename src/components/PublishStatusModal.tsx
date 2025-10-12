import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { App, Modal, TFile } from 'obsidian';

import type { IFlowershowSettings } from '../settings';
import type { PublishStatus } from '../Publisher';
import Publisher from '../Publisher';

import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { TreeItemDragAndDropOverlay, TreeViewBaseItem, UseTreeItemParameters } from '@mui/x-tree-view';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useTreeItem } from '@mui/x-tree-view/useTreeItem';
import { TreeItemProvider } from '@mui/x-tree-view/TreeItemProvider';
import { TreeItemIcon } from '@mui/x-tree-view/TreeItemIcon';
import { TreeItemIconContainer, TreeItemCheckbox, TreeItemLabel, TreeItemRoot, TreeItemContent, TreeItemGroupTransition } from '@mui/x-tree-view/TreeItem';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

interface PublishStatusModalProps {
  app: App;
  publisher: Publisher;
  settings: IFlowershowSettings;
}

type NodeType = "file" | "folder";

type ExtendedTreeItemProps = {
  nodeType?: NodeType;
  id: string;
  label: string;
};

function buildFileTree(items: Array<TFile | string>): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const nodeMap = new Map<string, TreeViewBaseItem<ExtendedTreeItemProps>>();

  items.forEach((item) => {
    const path = item instanceof TFile ? item.path : item;
    const parts = path.split('/');

    parts.forEach((part, i) => {
      const currentPath = parts.slice(0, i + 1).join('/');
      const parentPath = parts.slice(0, i).join('/');
      const isLastPart = i === parts.length - 1;

      if (!nodeMap.has(currentPath)) {
        nodeMap.set(currentPath, {
          id: currentPath,
          label: part,
          children: [],
          nodeType: isLastPart ? 'file' : 'folder', // ✅ set nodeType
        });
      }

      const currentNode = nodeMap.get(currentPath)!;

      if (i > 0) {
        const parentNode = nodeMap.get(parentPath);
        if (parentNode) {
          if (!parentNode.children) parentNode.children = [];
          if (!parentNode.children.some((child) => child.id === currentPath)) {
            parentNode.children.push(currentNode);
          }
        }
      }
    });
  });

  const rootNodes = Array.from(nodeMap.values()).filter((node) => !node.id.includes('/'));

  const sortNodes = (nodes: TreeViewBaseItem<ExtendedTreeItemProps>[]): TreeViewBaseItem<ExtendedTreeItemProps>[] =>
    nodes
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((node) => ({
        ...node,
        children:
          node.children && node.children.length > 0
            ? sortNodes(node.children as TreeViewBaseItem<ExtendedTreeItemProps>[])
            : undefined,
      }));

  return sortNodes(rootNodes);
}

interface SectionProps {
  title: string;
  count: number;
  items: Array<TFile | string>;
  buttonText?: string;
  loading?: boolean;
  onButtonClick?: () => Promise<void>;
  selectedItems?: string[];
  onSelectionChange?: (ids: (string | number)[]) => void;
}

const Section: React.FC<SectionProps> = ({
  title,
  count,
  items,
  buttonText,
  loading = false,
  onButtonClick,
  selectedItems = [],
  onSelectionChange,
}) => {
  const fileTree = React.useMemo(() => buildFileTree(items), [items]);

  // Collect a set of *file* IDs so we can filter selections
  const fileIdSet = React.useMemo(() => {
    const set = new Set<string>();
    const visit = (nodes: TreeViewBaseItem<ExtendedTreeItemProps>[]) => {
      for (const n of nodes) {
        if ((n as TreeViewBaseItem<ExtendedTreeItemProps>).nodeType === 'file') {
          set.add(String(n.id));
        }
        if (n.children && n.children.length) {
          visit(n.children as TreeViewBaseItem<ExtendedTreeItemProps>[]);
        }
      }
    };
    visit(fileTree);
    return set;
  }, [fileTree]);

  // Ensure the controlled selectedItems are files-only
  const selectedFileItems = React.useMemo(
    () => (selectedItems || []).filter((id) => fileIdSet.has(String(id))),
    [selectedItems, fileIdSet]
  );

  return (
    <div className="header-container" style={{ marginBottom: '8px' }}>
      <div className="title-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1em', margin: 0 }}>
          {title}
          <span className="count">({count} files)</span>
        </h3>
        {buttonText && onButtonClick && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const button = e.currentTarget as HTMLButtonElement;
              button.disabled = true;
              await onButtonClick();
              button.disabled = false;
            }}
            disabled={loading || selectedFileItems.length === 0}
          >
            {`${buttonText} (${selectedFileItems.length})`}
          </button>
        )}
      </div>

      {loading ? <div style={{ padding: '0 10px', color: 'var(--text-muted)' }}>Loading...</div> : (
        <RichTreeView
          aria-label={`${title} files`}
          items={fileTree}
          multiSelect
          checkboxSelection
          selectedItems={selectedFileItems}
          onSelectedItemsChange={(_, ids) => {
            // Drop any folder IDs; keep files only
            const filesOnly = (ids as (string | number)[]).filter((id) =>
              fileIdSet.has(String(id))
            );
            onSelectionChange?.(filesOnly);
          }}
          selectionPropagation={{ descendants: true, parents: true }}
          itemChildrenIndentation={16}
          slots={{ item: CustomTreeItem }}
          sx={{ flexGrow: 1, maxWidth: '100%', color: 'var(--text-normal)' }}
        />
      )}
    </div>
  );
};

export class PublishStatusModal extends Modal {
  private props: PublishStatusModalProps;
  private root: ReturnType<typeof createRoot> | null = null;

  constructor(props: PublishStatusModalProps) {
    super(props.app);
    this.props = props;
  }

  onOpen() {
    const container = this.contentEl.createDiv();
    container.addClass("publish-status-view");
    this.root = createRoot(container);
    this.root.render(<PublishStatusModalContent {...this.props} onClose={() => this.close()} />);
  }

  onClose() {
    if (this.root) {
      this.root.unmount();
    }
  }
}

interface PublishStatusModalContentProps extends PublishStatusModalProps {
  onClose: () => void;
}

const PublishStatusModalContent: React.FC<PublishStatusModalContentProps> = ({ 
  app, 
  publisher, 
  settings,
  onClose 
}) => {
  const [publishStatus, setPublishStatus] = React.useState<PublishStatus | null>(null);
  const [progressMessage, setProgressMessage] = React.useState('');

  const [selectedBySection, setSelectedBySection] = React.useState<Record<string, string[]>>({
    Changed: [],
    New: [],
    Deleted: [],
    Unchanged: [],
  });


  const fetchStatus = async () => {
    const status = await publisher.getPublishStatus();
    setPublishStatus(status);
  };

  React.useEffect(() => {
    fetchStatus();
  }, []);

  const refreshStatus = async () => {
    await fetchStatus();
  };

  const publishNewFiles = async () => {
    if (!publishStatus) return;
    const { newFiles } = publishStatus;
    
    try {
      setProgressMessage(`⌛ Publishing ${newFiles.length} unpublished notes...`);
      const result = await publisher.publishBatch({
        filesToPublish: newFiles
      });
      setProgressMessage(`✅ Published ${newFiles.length} notes. PR #${result.prNumber} ${result.merged ? 'merged' : 'created'}`);
    } catch (error) {
      if (error instanceof Error) {
        setProgressMessage(`❌ Error while publishing notes: ${error.message}`);
      }
    }

    setTimeout(() => setProgressMessage(''), 5000);
    await fetchStatus();
  };

  const publishChangedFiles = async () => {
    if (!publishStatus) return;
    const { changedFiles } = publishStatus;

    try {
      setProgressMessage(`⌛ Publishing ${changedFiles.length} changed notes...`);
      const result = await publisher.publishBatch({
        filesToPublish: changedFiles
      });
      setProgressMessage(`✅ Published ${changedFiles.length} notes. PR #${result.prNumber} ${result.merged ? 'merged' : 'created'}`);
    } catch (error) {
      if (error instanceof Error) {
        setProgressMessage(`❌ Error while publishing notes: ${error.message}`);
      }
    }

    setTimeout(() => setProgressMessage(''), 5000);
    await fetchStatus();
  };

  const unpublishDeletedFiles = async () => {
    if (!publishStatus) return;

    const { deletedFiles } = publishStatus;

    try {
      setProgressMessage(`⌛ Deleting ${deletedFiles.length} notes...`);
      const result = await publisher.publishBatch({
        filesToDelete: deletedFiles
      });
      setProgressMessage(`✅ Deleted ${deletedFiles.length} notes. PR #${result.prNumber} ${result.merged ? 'merged' : 'created'}`);
    } catch (error) {
      if (error instanceof Error) {
        setProgressMessage(`❌ Error while deleting notes: ${error.message}`);
      }
    }

    setTimeout(() => setProgressMessage(''), 5000);
    await fetchStatus();
  };

  const unpublishUnchangedFiles = async () => {
    if (!publishStatus) return;

    const { unchangedFiles } = publishStatus;

    try {
      setProgressMessage(`⌛ Deleting ${unchangedFiles.length} notes...`);
      const result = await publisher.publishBatch({
        filesToDelete: unchangedFiles.map((f) => f.path)
      });
      setProgressMessage(`✅ Deleted ${unchangedFiles.length} notes. PR #${result.prNumber} ${result.merged ? 'merged' : 'created'}`);
    } catch (error) {
      if (error instanceof Error) {
        setProgressMessage(`❌ Error while deleting notes: ${error.message}`);
      }
    }

    setTimeout(() => setProgressMessage(''), 5000);
    await fetchStatus();
  };


  const { unchangedFiles, changedFiles, newFiles, deletedFiles } = publishStatus || {
    unchangedFiles: [],
    changedFiles: [],
    newFiles: [],
    deletedFiles: []
  };

  const isLoading = !publishStatus;

  return (
    <>
      <div className="publish-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '10px',
        borderBottom: '1px solid var(--background-modifier-border)'
      }}>
        <div>
          <p className="publish-header-text" style={{ margin: '0' }}>
            Publishing to{' '}
            <a
              href={`https://github.com/${settings.githubUserName}/${settings.githubRepo}`}
              style={{ color: 'var(--text-accent)', textDecoration: 'none' }}
            >
              {settings.githubUserName}/{settings.githubRepo}
            </a>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div title="Refresh" className="clickable-icon" onClick={refreshStatus} style={{ cursor: 'pointer' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="svg-icon lucide-refresh-cw">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
          </div>
          {/* <div 
            className="clickable-icon" 
            onClick={() => {
              onClose();
              // @ts-ignore
              app.setting?.open();
              // @ts-ignore
              app.setting?.openTabById("obsidian-flowershow");
            }} 
            style={{ cursor: 'pointer' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="svg-icon lucide-settings">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div> */}
        </div>
      </div>

      <div className="progress-container" style={{ padding: '0 10px', marginBottom: '8px' }}>
        {progressMessage}
      </div>

      <div style={{ opacity: isLoading ? 0.7 : 1 }}>
        <Section
          title="Changed"
          count={changedFiles.length}
          items={changedFiles}
          buttonText="Update selected files"
          loading={isLoading}
          onButtonClick={publishChangedFiles}
          selectedItems={selectedBySection.Changed}
          onSelectionChange={(ids) => {
            console.log({ids})
            setSelectedBySection((s) => ({ ...s, Changed: ids as string[] }))
          }}
        />

        <Section
          title="New"
          count={newFiles.length}
          items={newFiles}
          buttonText="Publish selected files"
          loading={isLoading}
          onButtonClick={publishNewFiles}
          selectedItems={selectedBySection.New}
          onSelectionChange={(ids) =>
            setSelectedBySection((s) => ({ ...s, New: ids as string[] }))
          }
        />

        <Section
          title="Deleted"
          count={deletedFiles.length}
          items={deletedFiles}
          buttonText="Unpublish selected files"
          loading={isLoading}
          onButtonClick={unpublishDeletedFiles}
          selectedItems={selectedBySection.Deleted}
          onSelectionChange={(ids) =>
            setSelectedBySection((s) => ({ ...s, Deleted: ids as string[] }))
          }
        />

        <Section
          title="Unchanged (select to unpublish)"
          count={unchangedFiles.length}
          items={unchangedFiles}
          buttonText="Unpublish selected files"
          loading={isLoading}
          onButtonClick={unpublishUnchangedFiles}
          selectedItems={selectedBySection.Unchanged}
          onSelectionChange={(ids) =>
            setSelectedBySection((s) => ({ ...s, Unchanged: ids as string[] }))
          }
        />
      </div>

    </>
  );
};

// Simple styled wrappers for the custom item row (optional, minimal)
const ItemRoot = styled('li')({
  listStyle: 'none',
});
const ItemContent = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  borderRadius: 6,
  cursor: 'pointer',
}));

interface CustomTreeItemProps
  extends Omit<UseTreeItemParameters, 'rootRef'>,
    Omit<React.HTMLAttributes<HTMLLIElement>, 'onFocus'> {}

const CustomTreeItem = React.forwardRef(
  function CustomTreeItem(props: CustomTreeItemProps, ref: React.Ref<HTMLLIElement>) {
    const { id, itemId, label, disabled, children, ...other } = props;

    const {
      getContextProviderProps,
      getRootProps,
      getContentProps,
      getIconContainerProps,
      getCheckboxProps,
      getLabelProps,
      getGroupTransitionProps,
      getDragAndDropOverlayProps,
      status,
    } = useTreeItem({ id, itemId, label, disabled, rootRef: ref });

    // const item = useTreeItemModel<ExtendedTreeItemProps>(itemId);

    let IconComp = InsertDriveFileIcon;
    if (status.expandable) {
      IconComp = FolderRoundedIcon;
    }

    return (
      <TreeItemProvider {...getContextProviderProps()}>
        <TreeItemRoot {...getRootProps(other)}>
          <TreeItemContent {...getContentProps()}>
            <TreeItemIconContainer {...getIconContainerProps()}>
              <TreeItemIcon status={status} />
            </TreeItemIconContainer>
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
              <TreeItemCheckbox {...getCheckboxProps()} />
              <IconComp fontSize="small" />
              <TreeItemLabel {...getLabelProps()} />
            </Box>
          <TreeItemDragAndDropOverlay {...getDragAndDropOverlayProps()} />
          </TreeItemContent>
          {children ? (
            <TreeItemGroupTransition {...getGroupTransitionProps()}>
              {children}
            </TreeItemGroupTransition>
          ) : null}
        </TreeItemRoot>
      </TreeItemProvider>
    );
  }
);