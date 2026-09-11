import { useEffect, useState } from "react";
import { BottomTabBar, BOTTOM_TAB_BAR_HEIGHT } from "./components/BottomTabBar";
import { useAuth } from "./hooks/useAuth";
import { useLeads } from "./hooks/useLeads";
import { usePipeline } from "./hooks/usePipeline";
import { Header } from "./components/Header";
import { TopNav } from "./components/TopNav";
import { LeftNav } from "./components/LeftNav";
import { Landing } from "./components/LandingPage";
import { AuthModal } from "./components/AuthModal";
import { HomeDashboard } from "./components/HomeDashboard";
import { LeadsBoard } from "./components/LeadsBoard";
import { LeadCardModal } from "./components/LeadCardModal";
import { LeadCardMini } from "./components/LeadCardMini";
import { PipelineBoard } from "./components/PipelineBoard";
import { PipelineCardModal } from "./components/PipelineCardModal";
import { PipelineCardMini } from "./components/PipelineCardMini";
import { ViewTabs, BOARD_VIEW_LABELS, DEFAULT_BOARD_VIEW_ORDER } from "./components/ViewTabs";
import type { BoardSubView } from "./components/ViewTabs";
import { BoardListView } from "./components/BoardListView";
import { BoardValueView } from "./components/BoardValueView";
import { BoardCalendarView } from "./components/BoardCalendarView";
import { useDeals } from "./hooks/useDeals";
import { useDealTemplates } from "./hooks/useDealTemplates";
import { useTags } from "./hooks/useTags";
import { useTheme } from "./hooks/useTheme";
import { useProfile } from "./hooks/useProfile";
import type { Session } from "@supabase/supabase-js";
import { DealsBoard } from "./components/DealsBoard";
import { DealsListView } from "./components/DealsListView";
import { DealsAgentsView } from "./components/DealsAgentsView";
import { DealsStatCards } from "./components/DealsStatCards";
import { NewDealModal } from "./components/NewDealModal";
import { DealModal } from "./components/DealModal";
import { SettingsPage } from "./components/SettingsPage";
import { DialogsProvider, useDialogs } from "./components/DialogHost";
import { useIsMobile } from "./hooks/useMediaQuery";
import { DEAL_STATUSES, DEAL_STATUS_LIST_COLOR } from "./types";
import type { Deal, DealType, ListColor, Page, PipelineCard, Tag } from "./types";

const DEALS_VIEW_ORDER: BoardSubView[] = ["list", "board", "agents", "calendar", "value"];

// Stable reference (not a fresh `[]` literal per render) so the redirect
// effect below can safely depend on `hiddenModules` without re-running on
// every render when no hidden_modules value has loaded yet.
const NO_HIDDEN_MODULES: string[] = [];

// Stable reference for a card with no tags — same reasoning as
// NO_HIDDEN_MODULES above, avoids a fresh `[]` literal on every render.
const EMPTY_TAG_IDS: string[] = [];

// Pipeline is one app now — Leads, Pipeline, and Transactions sharing one
// nav (formerly a two-app split with a Tasks+Notes side at "/" and this CRM
// side at "/crm"; that split, AppId/APP_CONFIG/switchApp, and everything
// Tasks/Notes-only has been removed). "deals" stays the internal key (it
// matches the Deal type, the `deals` Supabase table, and every DealsX
// component name) even though its user-facing label below is
// "Transactions" — renaming the internal identifier throughout would touch
// dozens of files for zero user-visible benefit.
const NAV_ITEMS: { key: Page; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "leads", label: "Leads" },
  { key: "pipeline", label: "Pipeline" },
  { key: "deals", label: "Transactions" },
];

type LeadsData = ReturnType<typeof useLeads>;
type PipelineData = ReturnType<typeof usePipeline>;
type DealsData = ReturnType<typeof useDeals>;
type DealTemplatesData = ReturnType<typeof useDealTemplates>;

function LeadsDashboard({
  leads,
  tags,
  onCreateTag,
}: {
  leads: LeadsData;
  tags: Tag[];
  onCreateTag: (label: string, color: ListColor) => Promise<Tag | undefined>;
}) {
  const {
    columns,
    cards,
    notes,
    cardTagIds,
    loading,
    addColumn,
    renameColumn,
    setColumnColor,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    setCardTags,
    addNote,
    deleteNote,
  } = leads;

  const dialogs = useDialogs();
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [subView, setSubView] = useState<BoardSubView>("board");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Loading…
      </div>
    );
  }

  const openCard = openCardId ? cards.find((c) => c.id === openCardId) : undefined;
  const openCardSiblings = openCard ? cards.filter((c) => c.column_id === openCard.column_id) : [];
  const openCardIndex = openCard ? openCardSiblings.findIndex((c) => c.id === openCard.id) : -1;
  const prevCard = openCardIndex > 0 ? openCardSiblings[openCardIndex - 1] : undefined;
  const nextCard = openCardIndex >= 0 && openCardIndex < openCardSiblings.length - 1 ? openCardSiblings[openCardIndex + 1] : undefined;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "20px 24px 0" }}>
        <ViewTabs tabs={DEFAULT_BOARD_VIEW_ORDER.map((key) => ({ key, label: BOARD_VIEW_LABELS[key] }))} active={subView} onChange={setSubView} />
      </div>
      {subView === "board" && (
        <LeadsBoard
          columns={columns}
          cards={cards}
          tags={tags}
          cardTagIds={cardTagIds}
          onAddColumn={async () => {
            const label = await dialogs.prompt({ message: "Column name:" });
            if (label) addColumn(label);
          }}
          onRenameColumn={renameColumn}
          onSetColumnColor={setColumnColor}
          onDeleteColumn={deleteColumn}
          onAddCard={async (columnId) => {
            const card = await addCard(columnId);
            if (card) setOpenCardId(card.id);
          }}
          onOpenCard={setOpenCardId}
          onMoveCard={(cardId, columnId) => updateCard(cardId, { column_id: columnId })}
        />
      )}
      {subView === "list" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardListView columns={columns} cards={cards} itemNoun="lead" renderCard={(card) => (
            <LeadCardMini key={card.id} card={card} tags={tags} tagIds={cardTagIds[card.id] ?? EMPTY_TAG_IDS} onOpen={setOpenCardId} />
          )} />
        </div>
      )}
      {subView === "calendar" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardCalendarView cards={cards} onOpenCard={setOpenCardId} />
        </div>
      )}
      {subView === "value" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardValueView columns={columns} cards={cards} itemNoun="lead" />
        </div>
      )}
      {openCard && (
        <LeadCardModal
          key={openCard.id}
          card={openCard}
          columns={columns}
          notes={notes.filter((n) => n.card_id === openCard.id)}
          tags={tags}
          cardTagIds={cardTagIds[openCard.id] ?? EMPTY_TAG_IDS}
          onSetCardTags={setCardTags}
          onCreateTag={onCreateTag}
          onClose={() => setOpenCardId(null)}
          onUpdate={updateCard}
          onDelete={deleteCard}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
          onPrev={prevCard ? () => setOpenCardId(prevCard.id) : undefined}
          onNext={nextCard ? () => setOpenCardId(nextCard.id) : undefined}
        />
      )}
    </div>
  );
}

function PipelineDashboard({
  pipeline,
  tags,
  onCreateTag,
  onConvertToDeal,
}: {
  pipeline: PipelineData;
  tags: Tag[];
  onCreateTag: (label: string, color: ListColor) => Promise<Tag | undefined>;
  onConvertToDeal: (card: PipelineCard) => void;
}) {
  const {
    columns,
    cards,
    notes,
    cardTagIds,
    loading,
    addColumn,
    renameColumn,
    setColumnColor,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    setCardTags,
    addNote,
    deleteNote,
  } = pipeline;

  const dialogs = useDialogs();

  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [subView, setSubView] = useState<BoardSubView>("board");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Loading…
      </div>
    );
  }

  const openCard = openCardId ? cards.find((c) => c.id === openCardId) : undefined;
  const openCardSiblings = openCard ? cards.filter((c) => c.column_id === openCard.column_id) : [];
  const openCardIndex = openCard ? openCardSiblings.findIndex((c) => c.id === openCard.id) : -1;
  const prevCard = openCardIndex > 0 ? openCardSiblings[openCardIndex - 1] : undefined;
  const nextCard = openCardIndex >= 0 && openCardIndex < openCardSiblings.length - 1 ? openCardSiblings[openCardIndex + 1] : undefined;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "20px 24px 0" }}>
        <ViewTabs tabs={DEFAULT_BOARD_VIEW_ORDER.map((key) => ({ key, label: BOARD_VIEW_LABELS[key] }))} active={subView} onChange={setSubView} />
      </div>
      {subView === "board" && (
        <PipelineBoard
          columns={columns}
          cards={cards}
          tags={tags}
          cardTagIds={cardTagIds}
          onAddColumn={async () => {
            const label = await dialogs.prompt({ message: "Column name:" });
            if (label) addColumn(label);
          }}
          onRenameColumn={renameColumn}
          onSetColumnColor={setColumnColor}
          onDeleteColumn={deleteColumn}
          onAddCard={async (columnId) => {
            const card = await addCard(columnId);
            if (card) setOpenCardId(card.id);
          }}
          onOpenCard={setOpenCardId}
          onMoveCard={(cardId, columnId) => updateCard(cardId, { column_id: columnId })}
        />
      )}
      {subView === "list" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardListView columns={columns} cards={cards} itemNoun="client" renderCard={(card) => (
            <PipelineCardMini key={card.id} card={card} tags={tags} tagIds={cardTagIds[card.id] ?? EMPTY_TAG_IDS} onOpen={setOpenCardId} />
          )} />
        </div>
      )}
      {subView === "calendar" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardCalendarView cards={cards} onOpenCard={setOpenCardId} />
        </div>
      )}
      {subView === "value" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardValueView columns={columns} cards={cards} itemNoun="client" />
        </div>
      )}
      {openCard && (
        <PipelineCardModal
          key={openCard.id}
          card={openCard}
          columns={columns}
          notes={notes.filter((n) => n.card_id === openCard.id)}
          tags={tags}
          cardTagIds={cardTagIds[openCard.id] ?? EMPTY_TAG_IDS}
          onSetCardTags={setCardTags}
          onCreateTag={onCreateTag}
          onClose={() => setOpenCardId(null)}
          onUpdate={updateCard}
          onDelete={deleteCard}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
          onConvertToDeal={(card) => {
            onConvertToDeal(card);
            setOpenCardId(null);
          }}
          onPrev={prevCard ? () => setOpenCardId(prevCard.id) : undefined}
          onNext={nextCard ? () => setOpenCardId(nextCard.id) : undefined}
        />
      )}
    </div>
  );
}

function DealsDashboard({
  dealsData,
  dealTemplatesData,
  onMoveDealToPipeline,
  initialOpenDealId,
  onInitialDealOpened,
}: {
  dealsData: DealsData;
  dealTemplatesData: DealTemplatesData;
  onMoveDealToPipeline: (deal: Deal) => void;
  // Same deep-link pattern as LeadsDashboard/PipelineDashboard's own
  // initialOpenCardId — set by App.tsx right after converting a Pipeline
  // card into a transaction, so the brand-new transaction opens right away
  // instead of leaving the user to find it themselves in the list/board.
  initialOpenDealId?: string | null;
  onInitialDealOpened?: () => void;
}) {
  const {
    deals,
    notes,
    checklistItems,
    contactFields,
    loading,
    addDeal,
    updateDeal,
    deleteDeal,
    addNote,
    deleteNote,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    seedContactFields,
    ensureContactFields,
    addContactField,
    updateContactField,
    deleteContactField,
  } = dealsData;
  const { seedDealChecklist } = dealTemplatesData;

  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [subView, setSubView] = useState<BoardSubView>("list");

  useEffect(() => {
    if (!initialOpenDealId) return;
    setOpenDealId(initialOpenDealId);
    onInitialDealOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpenDealId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Loading…
      </div>
    );
  }

  const openDeal = openDealId ? deals.find((d) => d.id === openDealId) : undefined;

  // Flatten each deal's 4 milestone dates into synthetic calendar items so
  // the shared BoardCalendarView (built for one-due-date-per-item) can be
  // reused as-is instead of writing a bespoke Deals calendar.
  const milestoneItems = deals.flatMap((d) => {
    const milestones: { key: string; label: string; date: string | null }[] = [
      { key: "acceptance", label: "Acceptance", date: d.acceptance_date },
      { key: "inspection", label: "Inspection", date: d.inspection_date },
      { key: "appraisal", label: "Appraisal", date: d.appraisal_date },
      { key: "closing", label: "Closing", date: d.closing_date },
    ];
    return milestones
      .filter((m): m is { key: string; label: string; date: string } => !!m.date)
      .map((m) => ({ id: `${d.id}:${m.key}`, title: `${m.label}: ${d.address}`, due_date: m.date, dealId: d.id }));
  });

  // Statuses treated as pseudo-columns so the shared BoardValueView (built
  // for user-defined Lead/Pipeline columns) works for Deals' fixed statuses too.
  const statusColumns = DEAL_STATUSES.map((status) => ({ id: status, label: status, color: DEAL_STATUS_LIST_COLOR[status] }));
  const statusValueCards = deals.map((d) => ({ column_id: d.status, value: d.value }));

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Transactions</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>Every transaction you have access to.</p>
        </div>
        <button onClick={() => setShowNewDeal(true)} style={newDealButtonStyle}>
          + New Transaction
        </button>
      </div>
      <DealsStatCards deals={deals} />
      {/* Bottom padding, not just DealsStatCards' own marginBottom above —
          without it this row had zero space before whatever renders next:
          DealsListView's own Type/Status/Agent filter row (no top margin of
          its own, only marginBottom below it) sat flush against these tabs,
          reading as one cramped, bleeding-together block instead of two
          separate rows. */}
      <div style={{ padding: "0 24px 16px" }}>
        <ViewTabs tabs={DEALS_VIEW_ORDER.map((key) => ({ key, label: BOARD_VIEW_LABELS[key] }))} active={subView} onChange={setSubView} />
      </div>
      {subView === "list" && <DealsListView deals={deals} checklistItems={checklistItems} onOpenDeal={setOpenDealId} />}
      {subView === "board" && <DealsBoard deals={deals} checklistItems={checklistItems} onOpenDeal={setOpenDealId} />}
      {subView === "agents" && <DealsAgentsView deals={deals} onOpenDeal={setOpenDealId} />}
      {subView === "calendar" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardCalendarView
            cards={milestoneItems}
            onOpenCard={(syntheticId) => {
              const item = milestoneItems.find((i) => i.id === syntheticId);
              if (item) setOpenDealId(item.dealId);
            }}
          />
        </div>
      )}
      {subView === "value" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardValueView columns={statusColumns} cards={statusValueCards} itemNoun="deal" />
        </div>
      )}
      {showNewDeal && (
        <NewDealModal
          onClose={() => setShowNewDeal(false)}
          onCreate={async (address, type, acceptanceDate, agentName) => {
            const deal = await addDeal(address, type, acceptanceDate, agentName);
            setShowNewDeal(false);
            if (deal) {
              await Promise.all([seedDealChecklist(deal.id, deal.type), seedContactFields(deal.id)]);
              setOpenDealId(deal.id);
            }
          }}
        />
      )}
      {openDeal && (
        <DealModal
          deal={openDeal}
          notes={notes.filter((n) => n.deal_id === openDeal.id)}
          checklistItems={checklistItems.filter((i) => i.deal_id === openDeal.id)}
          contactFields={contactFields.filter((f) => f.deal_id === openDeal.id)}
          onClose={() => setOpenDealId(null)}
          onUpdate={updateDeal}
          onDelete={deleteDeal}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
          onAddChecklistItem={addChecklistItem}
          onToggleChecklistItem={toggleChecklistItem}
          onDeleteChecklistItem={deleteChecklistItem}
          onEnsureContactFields={ensureContactFields}
          onAddContactField={addContactField}
          onUpdateContactField={updateContactField}
          onDeleteContactField={deleteContactField}
          onMoveToPipeline={onMoveDealToPipeline}
        />
      )}
    </div>
  );
}

function PageContent({
  page,
  session,
  leadsData,
  pipelineData,
  dealsData,
  dealTemplatesData,
  tagsData,
  profileData,
  theme,
  onMoveDealToPipeline,
  onConvertToDeal,
  onOpenLeadCard,
  onOpenPipelineCard,
  pendingOpenDealId,
  onDealOpened,
}: {
  page: Page;
  session: Session;
  leadsData: LeadsData;
  pipelineData: PipelineData;
  dealsData: DealsData;
  dealTemplatesData: DealTemplatesData;
  tagsData: ReturnType<typeof useTags>;
  profileData: ReturnType<typeof useProfile>;
  theme: ReturnType<typeof useTheme>;
  onMoveDealToPipeline: (deal: Deal) => void;
  onConvertToDeal: (card: PipelineCard) => void;
  // Home's own card modals render at the App level (see homeOpenLeadCardId/
  // homeOpenPipelineCardId there) rather than through LeadsDashboard/
  // PipelineDashboard, specifically so opening one from Home never
  // navigates off Home — closing it lands back on Home, not on whichever
  // page would otherwise have mounted underneath. These two just start
  // that App-level state; Home doesn't read anything back from it.
  onOpenLeadCard: (id: string) => void;
  onOpenPipelineCard: (id: string) => void;
  pendingOpenDealId: string | null;
  onDealOpened: () => void;
}) {
  switch (page) {
    case "home":
      return (
        <HomeDashboard
          leads={leadsData.cards}
          pipelineCards={pipelineData.cards}
          deals={dealsData.deals}
          onOpenLeadCard={onOpenLeadCard}
          onOpenPipelineCard={onOpenPipelineCard}
        />
      );
    case "leads":
      return <LeadsDashboard leads={leadsData} tags={tagsData.tags} onCreateTag={tagsData.addTag} />;
    case "pipeline":
      return <PipelineDashboard pipeline={pipelineData} tags={tagsData.tags} onCreateTag={tagsData.addTag} onConvertToDeal={onConvertToDeal} />;
    case "deals":
      return (
        <DealsDashboard
          dealsData={dealsData}
          dealTemplatesData={dealTemplatesData}
          onMoveDealToPipeline={onMoveDealToPipeline}
          initialOpenDealId={pendingOpenDealId}
          onInitialDealOpened={onDealOpened}
        />
      );
    case "settings":
      return <SettingsPage session={session} profileData={profileData} theme={theme} dealTemplatesData={dealTemplatesData} tagsData={tagsData} />;
  }
}

function App() {
  const { session, loading } = useAuth();
  const [authModal, setAuthModal] = useState<"signin" | "signup" | null>(null);
  const [page, setPage] = useState<Page>("home");
  // Drives LeftNav vs. BottomTabBar/TopNav — a persistent sidebar has no
  // real phone equivalent, so mobile gets the bottom-tab-bar pattern
  // instead (same as this app's old native-tab-bar work).
  const isMobile = useIsMobile();

  const leads = useLeads(session?.user.id);
  const pipeline = usePipeline(session?.user.id);
  const deals = useDeals(session?.user.id);
  const dealTemplates = useDealTemplates(session?.user.id);
  const tags = useTags(session?.user.id);
  const profile = useProfile(session?.user.id);
  const theme = useTheme();
  const hiddenModules = profile.profile?.hidden_modules ?? NO_HIDDEN_MODULES;

  // If the currently-open module gets hidden (its nav tab just vanished),
  // don't leave a dead page up with no way back — jump to the first module
  // that's still visible, or Settings if every one of them has been hidden.
  useEffect(() => {
    if (page === "settings") return;
    if (!hiddenModules.includes(page)) return;
    const fallback = NAV_ITEMS.find((m) => !hiddenModules.includes(m.key));
    setPage(fallback?.key ?? "settings");
  }, [page, hiddenModules]);

  // Still needed even with the global +Create menu gone (see handleCreate's
  // removal below) — this one has a second caller, handleMoveDealToPipeline,
  // which opens the just-converted card the same way a fresh one from
  // Pipeline's own "+Add" would.
  const [createPipelineCardId, setCreatePipelineCardId] = useState<string | null>(null);

  // "Bust" a deal: convert it into a Pipeline card (first column) carrying
  // over address/value/type-as-tag plus its note history, then remove it
  // from Deals — same conversion invariant as the other module-to-module
  // moves (a card lives in exactly one of the four modules at a time).
  // Tags are attached in a second step (setCardTags needs a real card_id),
  // matched by label against the shared tag list rather than assuming a
  // "Buyer"/"Listing" tag still exists — the user can freely rename or
  // delete those starter tags, so if neither is found the card is simply
  // created untagged rather than silently recreating one.
  async function handleMoveDealToPipeline(deal: Deal) {
    const column = pipeline.columns[0];
    if (!column) {
      setPage("pipeline");
      return;
    }
    const newCard = await pipeline.addCardFromDeal(column.id, {
      title: deal.address,
      address: deal.address,
      value: deal.value,
      lastActivityText: "Moved back from Deals (deal busted)",
    });
    if (newCard) {
      const matchingTag = tags.tags.find((t) => t.label.toLowerCase() === deal.type.toLowerCase());
      if (matchingTag) await pipeline.setCardTags(newCard.id, [matchingTag.id]);
      const dealNotes = deals.notes.filter((n) => n.deal_id === deal.id);
      for (const note of dealNotes) {
        await pipeline.addNote(newCard.id, note.body);
      }
    }
    await deals.deleteDeal(deal.id);
    setPage("pipeline");
    if (newCard) setCreatePipelineCardId(newCard.id);
  }

  // The reverse conversion: a Pipeline client is ready to close, so turn
  // their card into a transaction. Unlike handleMoveDealToPipeline above,
  // the new transaction is opened via the pendingOpenDealId "deep link"
  // pattern (see DealsDashboard's initialOpenDealId) rather than a second
  // standalone modal instance here — DealModal takes far more props than
  // PipelineCardModal, so duplicating its whole render tree at this level
  // for one-time use wasn't worth it.
  async function handleConvertPipelineToDeal(card: PipelineCard) {
    const cardTagIds = pipeline.cardTagIds[card.id] ?? [];
    const matchingTag = tags.tags.find(
      (t) => cardTagIds.includes(t.id) && (t.label.toLowerCase() === "buyer" || t.label.toLowerCase() === "listing")
    );
    const type: DealType = matchingTag?.label.toLowerCase() === "listing" ? "Listing" : "Buyer";
    const deal = await deals.addDeal(card.address || card.title, type, null, null);
    if (deal) {
      if (card.value) await deals.updateDeal(deal.id, { value: card.value });
      await Promise.all([dealTemplates.seedDealChecklist(deal.id, deal.type), deals.seedContactFields(deal.id)]);
      const cardNotes = pipeline.notes.filter((n) => n.card_id === card.id);
      for (const note of cardNotes) {
        await deals.addNote(deal.id, note.body);
      }
    }
    await pipeline.deleteCard(card.id);
    setPage("deals");
    if (deal) setPendingOpenDealId(deal.id);
  }

  // Converting a Pipeline card into a transaction still navigates to
  // Transactions and deep-links into the new one there (see
  // handleConvertPipelineToDeal above and DealsDashboard's
  // initialOpenDealId) - that's a big enough action that landing on the
  // result makes sense. Cleared by DealsDashboard the moment it's consumed
  // so it never reopens on a later, unrelated re-render.
  const [pendingOpenDealId, setPendingOpenDealId] = useState<string | null>(null);

  // Home's own "reach out" list is different: opening a card from there
  // should NOT navigate away from Home at all, so that closing the modal
  // lands back on Home rather than on whichever page Leads/Pipeline would
  // otherwise be. These two just drive the standalone LeadCardModal/
  // PipelineCardModal rendered below, independent of `page`.
  const [homeOpenLeadCardId, setHomeOpenLeadCardId] = useState<string | null>(null);
  const [homeOpenPipelineCardId, setHomeOpenPipelineCardId] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-app)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading…
      </div>
    );
  }

  const createPipelineCard = createPipelineCardId ? pipeline.cards.find((c) => c.id === createPipelineCardId) : undefined;
  const homeOpenLeadCard = homeOpenLeadCardId ? leads.cards.find((c) => c.id === homeOpenLeadCardId) : undefined;
  const homeOpenPipelineCard = homeOpenPipelineCardId ? pipeline.cards.find((c) => c.id === homeOpenPipelineCardId) : undefined;

  return (
    <DialogsProvider>
    <div style={{ minHeight: "100dvh", background: "var(--bg-app)" }}>
      {session ? (
        // Signed-in app shell: LeftNav is a persistent sidebar beside the
        // content on desktop; on mobile it's replaced by a slim top bar
        // (TopNav) plus BottomTabBar for module navigation instead — a
        // sidebar has no real phone equivalent.
        // 100dvh, not 100vh — see index.css's #root comment for why: this
        // is the container BottomTabBar.tsx's position:fixed bar lives
        // inside, and iOS Safari's vh-vs-visible-viewport mismatch is
        // exactly what was cutting that bar off.
        <div style={{ display: "flex", minHeight: "100dvh" }}>
          {!isMobile && (
            <LeftNav
              session={session}
              profile={profile.profile}
              page={page}
              onSetPage={setPage}
              hiddenModules={hiddenModules}
              themeEffective={theme.effective}
              onToggleTheme={theme.toggleEffective}
              navItems={NAV_ITEMS}
            />
          )}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
            {isMobile && (
              <TopNav
                session={session}
                profile={profile.profile}
                page={page}
                onSetPage={setPage}
                themeEffective={theme.effective}
                onToggleTheme={theme.toggleEffective}
              />
            )}
            <main
              style={{
                flex: 1,
                minWidth: 0,
                // Reserve room for the fixed BottomTabBar below so page content
                // never renders underneath it — a no-op (0px) on desktop,
                // where the bar isn't rendered at all.
                paddingBottom: isMobile ? `calc(${BOTTOM_TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom))` : 0,
              }}
            >
              <PageContent
                page={page}
                session={session}
                leadsData={leads}
                pipelineData={pipeline}
                dealsData={deals}
                dealTemplatesData={dealTemplates}
                tagsData={tags}
                profileData={profile}
                theme={theme}
                onMoveDealToPipeline={handleMoveDealToPipeline}
                onConvertToDeal={handleConvertPipelineToDeal}
                onOpenLeadCard={setHomeOpenLeadCardId}
                onOpenPipelineCard={setHomeOpenPipelineCardId}
                pendingOpenDealId={pendingOpenDealId}
                onDealOpened={() => setPendingOpenDealId(null)}
              />
            </main>
            {isMobile && <BottomTabBar page={page} onSetPage={setPage} navItems={NAV_ITEMS} hiddenModules={hiddenModules} />}
          </div>
        </div>
      ) : (
        <>
          <Header
            onLogin={() => setAuthModal("signin")}
            onSignup={() => setAuthModal("signup")}
            themeEffective={theme.effective}
            onToggleTheme={theme.toggleEffective}
          />
          <Landing onGetStarted={() => setAuthModal("signup")} />
        </>
      )}
      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}

      {createPipelineCard && (
        <PipelineCardModal
          card={createPipelineCard}
          columns={pipeline.columns}
          notes={pipeline.notes.filter((n) => n.card_id === createPipelineCard.id)}
          tags={tags.tags}
          cardTagIds={pipeline.cardTagIds[createPipelineCard.id] ?? EMPTY_TAG_IDS}
          onSetCardTags={pipeline.setCardTags}
          onCreateTag={tags.addTag}
          onClose={() => setCreatePipelineCardId(null)}
          onUpdate={pipeline.updateCard}
          onDelete={pipeline.deleteCard}
          onAddNote={pipeline.addNote}
          onDeleteNote={pipeline.deleteNote}
          onConvertToDeal={(card) => {
            handleConvertPipelineToDeal(card);
            setCreatePipelineCardId(null);
          }}
        />
      )}

      {/* Home's "reach out" list opens these two independent of `page` (see
          homeOpenLeadCardId/homeOpenPipelineCardId above) so closing one
          leaves the visitor on Home, not on whichever page Leads/Pipeline
          would otherwise be mounted underneath. */}
      {homeOpenLeadCard && (
        <LeadCardModal
          card={homeOpenLeadCard}
          columns={leads.columns}
          notes={leads.notes.filter((n) => n.card_id === homeOpenLeadCard.id)}
          tags={tags.tags}
          cardTagIds={leads.cardTagIds[homeOpenLeadCard.id] ?? EMPTY_TAG_IDS}
          onSetCardTags={leads.setCardTags}
          onCreateTag={tags.addTag}
          onClose={() => setHomeOpenLeadCardId(null)}
          onUpdate={leads.updateCard}
          onDelete={leads.deleteCard}
          onAddNote={leads.addNote}
          onDeleteNote={leads.deleteNote}
        />
      )}
      {homeOpenPipelineCard && (
        <PipelineCardModal
          card={homeOpenPipelineCard}
          columns={pipeline.columns}
          notes={pipeline.notes.filter((n) => n.card_id === homeOpenPipelineCard.id)}
          tags={tags.tags}
          cardTagIds={pipeline.cardTagIds[homeOpenPipelineCard.id] ?? EMPTY_TAG_IDS}
          onSetCardTags={pipeline.setCardTags}
          onCreateTag={tags.addTag}
          onClose={() => setHomeOpenPipelineCardId(null)}
          onUpdate={pipeline.updateCard}
          onDelete={pipeline.deleteCard}
          onAddNote={pipeline.addNote}
          onDeleteNote={pipeline.deleteNote}
          onConvertToDeal={(card) => {
            handleConvertPipelineToDeal(card);
            setHomeOpenPipelineCardId(null);
          }}
        />
      )}

    </div>
    </DialogsProvider>
  );
}

export default App;

const newDealButtonStyle = {
  background: "var(--accent-strong)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

