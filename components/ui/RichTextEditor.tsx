'use client'

import { useEffect } from 'react'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  disabled?: boolean
  placeholder?: string
  minHeight?: number
  className?: string
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={cn('ticket-rich-editor-btn', active && 'is-active')}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = 'Write details…',
  minHeight = 140,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: activeEditor }) => {
      onChange(activeEditor.getHTML())
    },
    onBlur: () => {
      onBlur?.()
    },
    editorProps: {
      attributes: {
        class: 'ticket-rich-editor-content',
        style: `min-height: ${minHeight}px`,
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if ((value || '') !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [editor, value])

  function setLink() {
    if (!editor) return

    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? 'https://')
    if (url === null) return
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  if (!editor) {
    return (
      <div
        className={cn('ticket-rich-editor ticket-rich-editor--loading btf-input w-full', className)}
        style={{ minHeight }}
        aria-hidden
      />
    )
  }

  return (
    <div className={cn('ticket-rich-editor', disabled && 'ticket-rich-editor--disabled', className)}>
      <div className="ticket-rich-editor-toolbar" role="toolbar" aria-label="Formatting">
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold aria-hidden size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic aria-hidden size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive('underline')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon aria-hidden size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive('strike')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough aria-hidden size={15} />
        </ToolbarButton>
        <span className="ticket-rich-editor-divider" aria-hidden />
        <ToolbarButton
          label="Heading"
          active={editor.isActive('heading', { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <span className="ticket-rich-editor-btn-text">H</span>
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive('bulletList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List aria-hidden size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive('orderedList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered aria-hidden size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive('blockquote')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote aria-hidden size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive('link')}
          disabled={disabled}
          onClick={setLink}
        >
          <Link2 aria-hidden size={15} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
