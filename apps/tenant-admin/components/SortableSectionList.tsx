'use client'

import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getComponentDef } from '@dexo/shared/src/page-builder'
import ComponentFieldsEditor from './ComponentFieldsEditor'
import { Card } from '../app/(admin)/_ui'

/**
 * True drag-and-drop canvas for page sections — on top of (not instead of)
 * the up/down buttons, which stay as a keyboard/no-JS-drag-support
 * fallback. Reordering is optimistic locally (onReorder updates state
 * immediately) and persisted via one bulk-reorder API call per drop,
 * not N sequential up/down calls.
 */
export default function SortableSectionList({
  subdomain,
  sections,
  onReorder,
  onContentChange,
  onMove,
  onRemove,
}: {
  subdomain: string
  sections: any[]
  onReorder: (orderedIds: string[]) => void
  onContentChange: (sectionId: string, content: any) => void
  onMove: (sectionId: string, direction: 'up' | 'down') => void
  onRemove: (sectionId: string) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(sections, oldIndex, newIndex)
    onReorder(reordered.map((s) => s.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {sections.map((section, i) => (
            <SortableSectionCard
              key={section.id}
              subdomain={subdomain}
              section={section}
              index={i}
              isFirst={i === 0}
              isLast={i === sections.length - 1}
              onContentChange={onContentChange}
              onMove={onMove}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableSectionCard({
  subdomain,
  section,
  isFirst,
  isLast,
  onContentChange,
  onMove,
  onRemove,
}: {
  subdomain: string
  section: any
  index: number
  isFirst: boolean
  isLast: boolean
  onContentChange: (sectionId: string, content: any) => void
  onMove: (sectionId: string, direction: 'up' | 'down') => void
  onRemove: (sectionId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const def = getComponentDef(section.componentType)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              type="button"
              title="Drag to reorder"
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 px-1 touch-none"
            >
              ⠿
            </button>
            <span>{def?.icon}</span>
            <span className="font-semibold text-sm text-gray-900">{def?.label || section.componentType}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => onMove(section.id, 'up')} disabled={isFirst} className="text-gray-500 hover:text-gray-800 disabled:opacity-30" title="Move up">↑</button>
            <button onClick={() => onMove(section.id, 'down')} disabled={isLast} className="text-gray-500 hover:text-gray-800 disabled:opacity-30" title="Move down">↓</button>
            <button onClick={() => onRemove(section.id)} className="text-red-600 hover:underline">Remove</button>
          </div>
        </div>
        {def ? (
          <ComponentFieldsEditor
            subdomain={subdomain}
            def={def}
            content={section.content}
            onChange={(next) => onContentChange(section.id, next)}
          />
        ) : (
          <p className="text-xs text-red-500">Unknown component type "{section.componentType}"</p>
        )}
      </Card>
    </div>
  )
}
