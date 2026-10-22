import { useCallback, useRef, useState } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { useDashboardData } from '@/features/dashboard/dashboardData'
import { Button } from '@/shared/ui/Button'
import { IconPlus } from '@/shared/ui/icons'
import { Panel } from '@/shared/ui/Panel'
import { LiveStatus } from '../LiveStatus'
import { byAttr, usePendingFocus } from '../usePendingFocus'
import { CategoryForm } from './CategoryForm'
import { CategorySection } from './CategorySection'
import { EmptyMenu } from './EmptyMenu'
import styles from './ItemsTab.module.css'
import { focusKeys, type Focus } from './notify'
import { ItemsToolbar } from './ItemsToolbar'
import { ProductEditor } from './ProductEditor'
import type { SavedProduct } from './productEditor/formState'
import type { Product } from '@/entities/menu/menu'
import { fill } from '@/shared/lib/fill'
import { useItemsFilter } from './useItemsFilter'

const text = dashboardCopy.items

type Notice = { message: string; version: number }
type EditorTarget = {
  product: Product | null
  categoryId: string | null
  returnFocus: string
}

/**
 * The tab "Items" of the Menu page: every category with its items, the search, and the dialogs to add or change things.
 * One status region reads out what happened, and `notify` also says where the focus goes next, because the control the
 * owner used (a deleted row, a closed form) may be gone. When none of the controls asked for is in the page (the only item
 * a search found was deleted), the focus goes to the search box.
 */
export function ItemsTab() {
  const { menu } = useDashboardData()
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  const [notice, setNotice] = useState<Notice>({ message: '', version: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  // What the editor said when it saved, kept until it has closed: closing clears the status line.
  const savedMessage = useRef('')
  const view = useItemsFilter(menu, query)
  const focusLater = usePendingFocus(rootRef)

  const notify = useCallback(
    (message: string, focus?: Focus) => {
      setNotice((current) => ({ message, version: current.version + 1 }))
      if (focus === undefined) return
      const keys = typeof focus === 'string' ? [focus] : focus
      focusLater(...[...keys, focusKeys.search].map((key) => byAttr('data-focus', key)))
    },
    [focusLater],
  )

  const closeEditor = useCallback(() => {
    if (editor) notify(savedMessage.current, editor.returnFocus)
    savedMessage.current = ''
    setEditor(null)
  }, [editor, notify])

  const saved = ({ name, added }: SavedProduct) => {
    savedMessage.current = fill((added ? text.product.added : text.product.saved), { name })
  }

  const openEditor = (product: Product | null, categoryId: string) =>
    setEditor({
      product,
      categoryId,
      returnFocus: product ? focusKeys.edit(product.id) : focusKeys.addItem(categoryId),
    })

  const closeForm = (message: string) => {
    setAdding(false)
    notify(message, focusKeys.addCategory)
  }

  const form = adding && (
    <Panel title={text.category.newTitle}>
      <CategoryForm
        category={null}
        onSaved={(name) => closeForm(fill(text.category.added, { name }))}
        onCancel={() => closeForm('')}
      />
    </Panel>
  )

  return (
    <div ref={rootRef} className={styles.tab}>
      <LiveStatus message={notice.message} version={notice.version} />
      {form}
      {menu.categories.length === 0 ? (
        <EmptyMenu onAdd={() => setAdding(true)} notify={notify} />
      ) : (
        <>
          <ItemsToolbar query={query} onQuery={setQuery} view={view}>
            {!adding && (
              <Button onClick={() => setAdding(true)} data-focus={focusKeys.addCategory}>
                <IconPlus size={18} />
                {text.toolbar.addCategory}
              </Button>
            )}
          </ItemsToolbar>
          {view.searching && view.matches === 0 ? (
            <p className={styles.none}>{fill(text.toolbar.noResults, { query: query.trim() })}</p>
          ) : (
            <div className={styles.list} role="group" aria-label={text.listLabel}>
              {view.sections.map(({ category, products, total }) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  products={products}
                  total={total}
                  index={menu.categories.findIndex((candidate) => candidate.id === category.id)}
                  count={menu.categories.length}
                  reorder={!view.searching}
                  afterDelete={focusKeys.addCategory}
                  notify={notify}
                  onEdit={openEditor}
                />
              ))}
            </div>
          )}
        </>
      )}
      {editor && <ProductEditor product={editor.product} categoryId={editor.categoryId} onSaved={saved} onClose={closeEditor} />}
    </div>
  )
}
