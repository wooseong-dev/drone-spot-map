import { useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';

import { initialSpots } from './data/initialSpots';
import { airspaceZones } from './data/airspaceZones';
import { vworldLayers, VWorldLayerType } from './data/vworldLayers';

import { Review, SavedStatus, Spot, SpotCategory, ZoneType } from './types';
import Sidebar from './components/Sidebar';
import SpotMap from './components/SpotMap';
import SpotDetail from './components/SpotDetail';
import AddSpotModal from './components/AddSpotModal';
import ReviewModal from './components/ReviewModal';
import Disclaimer from './components/Disclaimer';
import LayerPanel from './components/LayerPanel';
import AuthButton from './components/AuthButton';
import AdminRequestsPanel from './components/AdminRequestsPanel';

import { zonesForPoint } from './utils';
import { getSpotIdFromPath, spotPath, updateSeo } from './seo';
import { supabase } from './lib/supabase';

import {
  addUserBookmark,
  fetchUserBookmarks,
  removeUserBookmark,
} from './services/bookmarks';

import {
  createApprovedSpot,
  createSpotRequest,
  fetchIsAdmin,
} from './services/spotSubmissions';

const STORAGE_KEY = 'drone-spot-map-spots-v7';
const PREVIOUS_STORAGE_KEY = 'drone-spot-map-spots-v6';
const LEGACY_STORAGE_KEY = 'drone-spot-map-spots-v5';
const SAVED_KEY = 'drone-spot-map-saved-status-v6';

function normalizeSpot(spot: Spot): Spot {
  return {
    ...spot,
    bestTime: spot.bestTime ?? [],
    viewPoints: spot.viewPoints ?? [],
    cautions: spot.cautions ?? [],
    tags: spot.tags ?? [],
    reviews: spot.reviews ?? [],
    takeoffSpace: spot.takeoffSpace ?? 'unknown',
    crowdLevel: spot.crowdLevel ?? 'unknown',
    officialCheckUrl: spot.officialCheckUrl ?? 'https://drone.onestop.go.kr/',
  };
}

function loadSpots(): Spot[] {
  const saved =
    localStorage.getItem(STORAGE_KEY) ||
    localStorage.getItem(PREVIOUS_STORAGE_KEY) ||
    localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!saved) return initialSpots.map(normalizeSpot);

  try {
    return (JSON.parse(saved) as Spot[]).map(normalizeSpot);
  } catch {
    return initialSpots.map(normalizeSpot);
  }
}

function saveSpots(spots: Spot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
}

function loadSavedStatus(): Record<string, SavedStatus[]> {
  const saved = localStorage.getItem(SAVED_KEY);
  if (!saved) return {};

  try {
    return JSON.parse(saved) as Record<string, SavedStatus[]>;
  } catch {
    return {};
  }
}

function saveSavedStatus(value: Record<string, SavedStatus[]>) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(value));
}

const defaultLayers: Record<ZoneType, boolean> = {
  noFly: false,
  restricted: false,
  control: false,
  danger: false,
  nationalPark: false,
  heritage: false,
};

const defaultVWorldLayers: Record<VWorldLayerType, boolean> = {
  noFly: true,
  restricted: true,
  control: true,
  military: false,
  danger: false,
  droneZone: false,
};

const vworldKey = import.meta.env.VITE_VWORLD_KEY as string | undefined;
const vworldDomain = import.meta.env.VITE_VWORLD_DOMAIN as string | undefined;

export type QuickFilter =
  | 'parking'
  | 'beginner'
  | 'sunset'
  | 'night'
  | 'quiet'
  | 'wind'
  | 'approval';

export default function App() {
  const [spots, setSpots] = useState<Spot[]>(loadSpots);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileLayersOpen, setMobileLayersOpen] = useState(false);

  const initialSpotId = getSpotIdFromPath(window.location.pathname);

  const [selectedSpotId, setSelectedSpotId] = useState<string | undefined>(() =>
    spots.some((spot) => spot.id === initialSpotId) ? initialSpotId : spots[0]?.id
  );

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | SpotCategory>('all');
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([]);
  const [savedStatus, setSavedStatus] =
    useState<Record<string, SavedStatus[]>>(loadSavedStatus);

  const [addOpen, setAddOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [draftCoords, setDraftCoords] = useState<
    { lat: number; lng: number } | undefined
  >();

  const [visibleLayers, setVisibleLayers] =
    useState<Record<ZoneType, boolean>>(defaultLayers);

  const [visibleVWorldLayers, setVisibleVWorldLayers] =
    useState<Record<VWorldLayerType, boolean>>(defaultVWorldLayers);

  async function reloadSpotsFromSupabase() {
    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .eq('status', 'approved')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('[Supabase] Failed to reload spots:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.warn('[Supabase] No approved spots found. Fallback data remains active.');
      return;
    }

    const nextSpots = (data as Spot[]).map(normalizeSpot);

    console.log('[Supabase] Loaded spots:', nextSpots);

    setSpots(nextSpots);

    const pathSpotId = getSpotIdFromPath(window.location.pathname);

    setSelectedSpotId(
      nextSpots.some((spot) => spot.id === pathSpotId)
        ? pathSpotId
        : nextSpots[0]?.id
    );
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (ignore) return;
      await reloadSpotsFromSupabase();
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function checkAdmin() {
      const nextIsAdmin = await fetchIsAdmin(user);

      if (!ignore) {
        setIsAdmin(nextIsAdmin);
      }
    }

    checkAdmin();

    return () => {
      ignore = true;
    };
  }, [user]);

  useEffect(() => {
    async function loadBookmarks() {
      if (!user) {
        setSavedStatus(loadSavedStatus());
        return;
      }

      const remoteBookmarks = await fetchUserBookmarks(user.id);
      setSavedStatus(remoteBookmarks);
    }

    loadBookmarks();
  }, [user]);

  useEffect(() => {
    if (!user) {
      saveSavedStatus(savedStatus);
    }
  }, [savedStatus, user]);

  useEffect(() => {
    function handlePopState() {
      const pathSpotId = getSpotIdFromPath(window.location.pathname);
      setSelectedSpotId(
        spots.some((spot) => spot.id === pathSpotId) ? pathSpotId : spots[0]?.id
      );
    }

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [spots]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;

      setMobileSidebarOpen(false);
      setMobileLayersOpen(false);
    }

    window.addEventListener('keydown', handleEscape);

    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const filteredSpots = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return spots.filter((spot) => {
      const categoryMatched = category === 'all' || spot.category === category;

      const text = [
        spot.name,
        spot.address,
        spot.description,
        spot.takeoffPoint,
        ...spot.tags,
        ...spot.bestTime,
        ...spot.viewPoints,
        ...spot.cautions,
      ]
        .join(' ')
        .toLowerCase();

      const searchMatched = !keyword || text.includes(keyword);

      const quickMatched = quickFilters.every((filter) => {
        if (filter === 'parking') return spot.parking === 'good';

        if (filter === 'beginner') {
          return spot.difficulty === 'easy' || spot.cautionLevel === 'easy';
        }

        if (filter === 'sunset') {
          return (
            spot.category === 'sunset' ||
            spot.bestTime.some((item) => item.includes('일몰')) ||
            spot.tags.some((tag) => tag.includes('일몰'))
          );
        }

        if (filter === 'night') {
          return (
            spot.category === 'night' ||
            spot.bestTime.some((item) => item.includes('야경')) ||
            spot.tags.some((tag) => tag.includes('야경'))
          );
        }

        if (filter === 'quiet') {
          return (
            spot.crowdLevel === 'low' ||
            spot.tags.some((tag) => tag.includes('사람 적'))
          );
        }

        if (filter === 'wind') {
          return (
            spot.cautions.some((item) => item.includes('바람')) ||
            spot.tags.some((tag) => tag.includes('바람'))
          );
        }

        if (filter === 'approval') {
          return (
            spot.cautionLevel === 'approval' ||
            spot.tags.some((tag) => tag.includes('공식확인'))
          );
        }

        return true;
      });

      return categoryMatched && searchMatched && quickMatched;
    });
  }, [spots, category, search, quickFilters]);

  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId);

  useEffect(() => {
    updateSeo(selectedSpot);
  }, [selectedSpot]);

  function selectSpot(spot: Spot) {
    setSelectedSpotId(spot.id);
    setMobileSidebarOpen(false);

    const nextPath = spotPath(spot);

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }

  function clearSelectedSpot() {
    setSelectedSpotId(undefined);

    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  }

  const visibleZones = airspaceZones.filter((zone) => visibleLayers[zone.type]);

  const matchedZones = selectedSpot
    ? zonesForPoint(selectedSpot.lat, selectedSpot.lng, visibleZones)
    : [];

  function updateSpots(next: Spot[]) {
    setSpots(next);
    saveSpots(next);
  }

  async function handleAddSpot(spot: Spot) {
    if (!user) {
      alert('로그인 후 스팟을 제보할 수 있습니다.');
      return;
    }

    const normalizedSpot = normalizeSpot(spot);

    if (isAdmin) {
      const createdSpot = await createApprovedSpot(normalizedSpot);
      const nextSpot = normalizeSpot(createdSpot);

      const next = [nextSpot, ...spots.filter((item) => item.id !== nextSpot.id)];

      updateSpots(next);
      selectSpot(nextSpot);
      setDraftCoords(undefined);
      setMobileSidebarOpen(false);
      return;
    }

    await createSpotRequest(normalizedSpot, user);

    setDraftCoords(undefined);
    setMobileSidebarOpen(false);
  }

  function handleAddReview(review: Review) {
    if (!selectedSpot) return;

    const next = spots.map((spot) =>
      spot.id === selectedSpot.id
        ? { ...spot, reviews: [review, ...spot.reviews] }
        : spot
    );

    updateSpots(next);
  }

  function toggleLayer(type: ZoneType) {
    setVisibleLayers((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  function toggleAllLayers(value: boolean) {
    setVisibleLayers({
      noFly: value,
      restricted: value,
      control: value,
      danger: value,
      nationalPark: value,
      heritage: value,
    });
  }

  function handleMapContextAdd(lat: number, lng: number) {
    setDraftCoords({ lat, lng });
    setAddOpen(true);
  }

  function closeAddModal() {
    setAddOpen(false);
    setDraftCoords(undefined);
  }

  function toggleVWorldLayer(type: VWorldLayerType) {
    setVisibleVWorldLayers((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  function toggleAllVWorldLayers(value: boolean) {
    const next = Object.fromEntries(
      vworldLayers.map((layer) => [layer.id, value])
    ) as Record<VWorldLayerType, boolean>;

    setVisibleVWorldLayers(next);
  }

  function toggleQuickFilter(filter: QuickFilter) {
    setQuickFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((item) => item !== filter)
        : [...prev, filter]
    );
  }

  async function toggleSavedStatus(spotId: string, status: SavedStatus) {
    const current = savedStatus[spotId] ?? [];
    const alreadySaved = current.includes(status);

    const nextForSpot = alreadySaved
      ? current.filter((item) => item !== status)
      : [...current, status];

    setSavedStatus((prev) => ({
      ...prev,
      [spotId]: nextForSpot,
    }));

    if (!user) {
      return;
    }

    try {
      if (alreadySaved) {
        await removeUserBookmark(user.id, spotId, status);
      } else {
        await addUserBookmark(user.id, spotId, status);
      }
    } catch (error) {
      console.error('[Supabase] Bookmark sync failed:', error);

      setSavedStatus((prev) => ({
        ...prev,
        [spotId]: current,
      }));
    }
  }

  const activeFilterCount =
    quickFilters.length + (category === 'all' ? 0 : 1) + (search.trim() ? 1 : 0);

  return (
    <div className="app responsiveApp">
      <header className="mobileHeader">
        <button
          className="mobileIconButton"
          type="button"
          aria-label="장소 검색 메뉴 열기"
          onClick={() => setMobileSidebarOpen(true)}
        >
          ☰
        </button>

        <div className="mobileHeaderTitle">
          <strong>드론스팟맵</strong>
          <span>드론 촬영지 정보</span>
        </div>

        <button
          className="mobileFilterButton"
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
        >
          필터{activeFilterCount > 0 ? ` ${activeFilterCount}` : ''}
        </button>
      </header>

      {mobileSidebarOpen && (
        <button
          className="mobileOverlay"
          type="button"
          aria-label="모바일 메뉴 닫기"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside className={`sidebarShell ${mobileSidebarOpen ? 'isOpen' : ''}`}>
        <div className="mobileDrawerHeader">
          <div>
            <strong>장소 검색</strong>
            <span>스팟, 필터, 로그인</span>
          </div>
          <button
            className="mobileCloseButton"
            type="button"
            aria-label="장소 검색 메뉴 닫기"
            onClick={() => setMobileSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="sidebarAuthMobile">
          <AuthButton user={user} />
        </div>

        <Sidebar
          spots={filteredSpots}
          selectedSpotId={selectedSpotId}
          category={category}
          search={search}
          quickFilters={quickFilters}
          savedStatus={savedStatus}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onQuickFilterToggle={toggleQuickFilter}
          onSelectSpot={selectSpot}
          onAddClick={() => {
            setAddOpen(true);
            setMobileSidebarOpen(false);
          }}
        />
      </aside>

      <div className="floatingAuth desktopAuth">
        <AuthButton user={user} />
      </div>

      <main className="main">
        <Disclaimer />

        <div className="mapArea">
          <button
            className="mobileLayerToggle"
            type="button"
            onClick={() => setMobileLayersOpen((prev) => !prev)}
          >
            {mobileLayersOpen ? '레이어 닫기' : '레이어'}
          </button>

          <div className={`layerPanelShell ${mobileLayersOpen ? 'isOpen' : ''}`}>
            <LayerPanel
              visibleLayers={visibleLayers}
              visibleVWorldLayers={visibleVWorldLayers}
              vworldEnabled={Boolean(vworldKey)}
              onToggle={toggleLayer}
              onToggleAll={toggleAllLayers}
              onToggleVWorld={toggleVWorldLayer}
              onToggleAllVWorld={toggleAllVWorldLayers}
            />
          </div>

          <SpotMap
            spots={filteredSpots}
            zones={airspaceZones}
            visibleLayers={visibleLayers}
            visibleVWorldLayers={visibleVWorldLayers}
            vworldKey={vworldKey}
            vworldDomain={vworldDomain}
            selectedSpot={selectedSpot}
            onSelectSpot={selectSpot}
            onMapContextAdd={handleMapContextAdd}
          />
        </div>
      </main>

      <div className={`spotDetailShell ${selectedSpot ? 'isOpen' : ''}`}>
  <div className="mobileSheetHandle" />

  <div className="spotDetailContentStack">
    <SpotDetail
  spot={selectedSpot}
  matchedZones={matchedZones}
  savedStatuses={selectedSpot ? savedStatus[selectedSpot.id] ?? [] : []}
  user={user}
  onToggleSavedStatus={(status) =>
    selectedSpot && toggleSavedStatus(selectedSpot.id, status)
  }
  onClose={clearSelectedSpot}
  onReviewClick={() => setReviewOpen(true)}
/>
  </div>
</div>

      <AdminRequestsPanel
        isAdmin={isAdmin}
        onChanged={reloadSpotsFromSupabase}
      />

      <AddSpotModal
        open={addOpen}
        onClose={closeAddModal}
        onAdd={handleAddSpot}
        initialCoords={draftCoords}
        isAdmin={isAdmin}
        isLoggedIn={Boolean(user)}
      />

      <ReviewModal
        open={reviewOpen}
        spotName={selectedSpot?.name}
        onClose={() => setReviewOpen(false)}
        onAdd={handleAddReview}
      />
    </div>
  );
}