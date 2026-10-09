<script lang="ts">
  import {
    ArrowLeft,
    ArrowRight,
    Code2,
    File,
    Folder,
    FolderOpen,
    Home,
    Image,
    LayoutGrid,
    List,
    MoreVertical,
    Pencil,
    Play,
    Save,
    Search,
    Star,
    Trash2,
    X,
  } from "@lucide/svelte";

  type Item = {
    name: string;
    type: "directory" | "file";
    size: number | null;
    modified: string;
  };
  type Favorite = { name: string; path: string; type?: Item["type"] };
  type Recent = { name: string; path: string };
  export let mode: "favorites" | "files" | "editor" = "files";
  export let path = ".";
  export let items: Item[] = [];
  export let loading = false;
  export let error = "";
  export let open: (path: string) => void;
  export let navigatePage: (mode: "favorites" | "files" | "editor") => void;

  let favorites: Favorite[] = [];
  let recents: Recent[] = [];
  let historyBack: string[] = [];
  let historyForward: string[] = [];
  let editorRoot = "";
  let editorPath = "";
  let editorName = "";
  let editorContent = "";
  let savedContent = "";
  let editorLoading = false;
  let editorSaving = false;
  let editorError = "";
  let pickerOpen = false;
  let pickerMode: "file" | "folder" = "file";
  let pickerPath = ".";
  let pickerItems: Item[] = [];
  let pickerLoading = false;
  let pickerError = "";
  let fileSearch = "";
  let previewPath = "";
  let previewName = "";
  let previewKind: "image" | "pdf" | "audio" | "video" | "" = "";
  let fileView: "list" | "grid" = "list";
  let openItemMenu = "";
  let showHiddenFiles = false;
  let openViewMenu = false;

  function loadPreferences() {
    try {
      const f = JSON.parse(
        localStorage.getItem("omp-workspace-favorites") ?? "[]",
      );
      const r = JSON.parse(
        localStorage.getItem("omp-workspace-recents") ?? "[]",
      );
      const v = localStorage.getItem("omp-workspace-view");
      const h = localStorage.getItem("omp-workspace-hidden");
      favorites = Array.isArray(f) ? f : [];
      recents = Array.isArray(r) ? r : [];
      fileView = v === "grid" ? "grid" : "list";
      showHiddenFiles = h === "true";
      openViewMenu = false;
    } catch {
      favorites = [];
      recents = [];
      fileView = "list";
      showHiddenFiles = false;
      openViewMenu = false;
    }
  }
  function persist() {
    localStorage.setItem("omp-workspace-favorites", JSON.stringify(favorites));
    localStorage.setItem("omp-workspace-recents", JSON.stringify(recents));
  }
  function setFileView(view: "list" | "grid") {
    fileView = view;
    localStorage.setItem("omp-workspace-view", view);
  }
  function setShowHiddenFiles(value: boolean) {
    showHiddenFiles = value;
    openViewMenu = false;
    localStorage.setItem("omp-workspace-hidden", String(value));
  }
  function toggleViewMenu() {
    openViewMenu = !openViewMenu;
  }
  function toggleItemMenu(value: string) {
    openItemMenu = openItemMenu === value ? "" : value;
  }
  function editItem(item: Item) {
    const itemPath = folderPath(item.name);
    openItemMenu = "";
    if (item.type === "directory") {
      navigateTo(itemPath);
      return;
    }
    navigatePage("editor");
    void loadFile(itemPath, item.name);
  }
  async function deleteItem(item: Item) {
    const itemPath = folderPath(item.name);
    openItemMenu = "";
    if (!confirm("Delete " + (item.type === "directory" ? "folder" : "file") + " " + item.name + "?")) return;
    try {
      const query = new URLSearchParams({ path: itemPath });
      const response = await fetch("/api/workspace?" + query.toString(), { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to delete item");
      open(path);
    } catch (error) {
      editorError = error instanceof Error ? error.message : "Unable to delete item";
    }
  }
  function isFavorite(value: string) {
    return favorites.some((item) => item.path === value);
  }
  function toggleFavorite(
    value: string,
    name?: string,
    type: Item["type"] = "directory",
  ) {
    if (value === ".") return;
    favorites = isFavorite(value)
      ? favorites.filter((item) => item.path !== value)
      : [
          ...favorites,
          { name: name ?? value.split("/").at(-1) ?? value, path: value, type },
        ];
    persist();
  }
  function rememberRecent(value: string, name?: string) {
    if (value === ".") return;
    recents = [
      { name: name ?? value.split("/").at(-1) ?? value, path: value },
      ...recents.filter((item) => item.path !== value),
    ].slice(0, 8);
    persist();
  }
  function folderPath(name: string) {
    return path === "." ? name : path + "/" + name;
  }
  function navigateTo(nextPath: string) {
    if (nextPath === path) return;
    historyBack = [...historyBack, path];
    historyForward = [];
    open(nextPath);
  }
  function goBack() {
    const previous = historyBack.at(-1);
    if (!previous) return;
    historyBack = historyBack.slice(0, -1);
    historyForward = [path, ...historyForward];
    open(previous);
  }
  function goForward() {
    const next = historyForward[0];
    if (!next) return;
    historyForward = historyForward.slice(1);
    historyBack = [...historyBack, path];
    open(next);
  }
  function openFolder(folder: string, name?: string) {
    open(folder);
    rememberRecent(folder, name);
  }
  function previewKindFor(name: string) {
    const extension = name.split(".").at(-1)?.toLowerCase() ?? "";
    if (
      [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "bmp",
        "ico",
        "svg",
        "avif",
      ].includes(extension)
    )
      return "image" as const;
    if (extension === "pdf") return "pdf" as const;
    if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension))
      return "audio" as const;
    if (["mp4", "webm", "mov", "m4v", "ogv"].includes(extension))
      return "video" as const;
    return "";
  }
  function isPreviewable(name: string) {
    return Boolean(previewKindFor(name));
  }
  function previewUrl(filePath: string) {
    return "/api/workspace/preview?path=" + encodeURIComponent(filePath);
  }
  function showPreview(filePath: string, name: string) {
    previewPath = filePath;
    previewName = name;
    previewKind = previewKindFor(name);
  }
  function clearPreview() {
    previewPath = "";
    previewName = "";
    previewKind = "";
  }
  function openItem(item: Item) {
    const itemPath = folderPath(item.name);
    if (item.type === "directory") {
      navigateTo(itemPath);
    } else if (isPreviewable(item.name)) {
      showPreview(itemPath, item.name);
    } else {
      navigatePage("editor");
      void loadFile(itemPath, item.name);
    }
  }
  $: visibleItems = items.filter((item) =>
    (showHiddenFiles || !item.name.startsWith(".")) &&
    item.name.toLowerCase().includes(fileSearch.trim().toLowerCase()),
  );
  function openFavorite(favorite: Favorite) {
    if ((favorite.type ?? "directory") === "directory") {
      openFolder(favorite.path, favorite.name);
    } else if (isPreviewable(favorite.name)) {
      navigatePage("files");
      showPreview(favorite.path, favorite.name);
    } else {
      navigatePage("editor");
      void loadFile(favorite.path, favorite.name);
    }
  }

  async function readPicker(nextPath: string) {
    pickerLoading = true;
    pickerError = "";
    try {
      const response = await fetch(
        "/api/workspace?path=" + encodeURIComponent(nextPath),
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to browse files");
      pickerPath = data.path;
      pickerItems = data.items ?? [];
    } catch (e) {
      pickerError = e instanceof Error ? e.message : "Unable to browse files";
    } finally {
      pickerLoading = false;
    }
  }
  function openPicker(kind: "file" | "folder") {
    pickerMode = kind;
    pickerOpen = true;
    readPicker(editorRoot || ".");
  }
  function closePicker() {
    pickerOpen = false;
  }
  async function choosePicker(item: Item) {
    const selected =
      pickerPath === "." ? item.name : pickerPath + "/" + item.name;
    if (item.type === "directory") {
      if (pickerMode === "folder") {
        editorRoot = selected;
        editorPath = "";
        editorName = "";
        editorContent = "";
        savedContent = "";
        rememberRecent(selected, item.name);
        pickerOpen = false;
      } else {
        readPicker(selected);
      }
      return;
    }
    if (pickerMode === "file") {
      await loadFile(selected, item.name);
      pickerOpen = false;
    }
  }
  async function loadFile(filePath: string, name?: string) {
    editorLoading = true;
    editorError = "";
    try {
      const response = await fetch(
        "/api/workspace/file?path=" + encodeURIComponent(filePath),
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to open file");
      editorPath = filePath;
      editorName = name ?? filePath.split("/").at(-1) ?? filePath;
      editorContent = data.content ?? "";
      savedContent = editorContent;
      editorRoot = filePath.split("/").slice(0, -1).join("/") || ".";
      rememberRecent(
        editorRoot,
        editorRoot === "." ? "Home" : editorRoot.split("/").at(-1),
      );
    } catch (e) {
      editorError = e instanceof Error ? e.message : "Unable to open file";
    } finally {
      editorLoading = false;
    }
  }
  function openProject(projectPath: string, name: string) {
    editorRoot = projectPath;
    editorPath = "";
    editorName = "";
    editorContent = "";
    savedContent = "";
    editorError = "";
    rememberRecent(projectPath, name);
    navigatePage("editor");
    open(projectPath);
  }
  async function saveEditor() {
    if (!editorPath || editorContent === savedContent) return;
    editorSaving = true;
    editorError = "";
    try {
      const response = await fetch(
        "/api/workspace/file?path=" + encodeURIComponent(editorPath),
        {
          method: "PUT",
          headers: { "content-type": "text/plain; charset=utf-8" },
          body: editorContent,
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save file");
      savedContent = editorContent;
    } catch (e) {
      editorError = e instanceof Error ? e.message : "Unable to save file";
    } finally {
      editorSaving = false;
    }
  }
  function onEditorKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void saveEditor();
    }
  }
  function formatSize(size: number | null) {
    if (size === null) return "—";
    if (size < 1024) return size + " B";
    if (size < 1024 ** 2) return (size / 1024).toFixed(1) + " KB";
    if (size < 1024 ** 3) return (size / 1024 ** 2).toFixed(1) + " MB";
    return (size / 1024 ** 3).toFixed(1) + " GB";
  }
  function formatDate(value: string) {
    return new Date(value).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  $: editorDirty = editorContent !== savedContent;
  $: projectLabel =
    editorRoot === "." ? "Home" : (editorRoot.split("/").at(-1) ?? editorRoot);
  if (typeof window !== "undefined") loadPreferences();
</script>

<div class="h-full min-h-0">
  {#if mode === "favorites"}
    <div class="mx-auto max-w-6xl">
      <div class="mb-5 flex items-center justify-between">
        <div>
          <h2 class="text-[13px] font-semibold">Favorites</h2>
          <p class="mt-1 text-[10px] opacity-45">
            Quick access to files and folders.
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-[#412d15] px-3 py-2 text-[10px] font-medium text-[#e1dcc9]"
          on:click={() => navigatePage("files")}>Browse files</button
        >
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          class="flex items-center gap-3 rounded-xl border border-[#1f150c]/[.10] p-4 text-left hover:bg-[#412d15]/[.04] dark:border-[#e1dcc9]/[.08] dark:hover:bg-white/[.03]"
          on:click={() => openProject(".", "Home")}
        >
          <Home size={18} /><span
            ><b class="block text-[11px]">Home</b><small
              class="text-[9px] opacity-40">/home</small
            ></span
          >
        </button>
        {#each favorites as favorite}
          <div class="group relative">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-[#1f150c]/[.10] p-4 pr-10 text-left hover:bg-[#412d15]/[.04] dark:border-[#e1dcc9]/[.08] dark:hover:bg-white/[.03]"
              on:click={() => openFavorite(favorite)}
            >
              {#if (favorite.type ?? "directory") === "directory"}<FolderOpen
                  size={18}
                />{:else if isPreviewable(favorite.name)}<Image
                  size={18}
                />{:else}<File size={18} />{/if}<span class="min-w-0"
                ><b class="block truncate text-[11px]">{favorite.name}</b><small
                  class="block truncate text-[9px] opacity-40"
                  >{favorite.path}</small
                ></span
              >
            </button>
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 group-hover:opacity-100"
              on:click={() => toggleFavorite(favorite.path)}
              aria-label="Remove favorite"
              ><Star size={13} class="fill-current" /></button
            >
          </div>
        {/each}
      </div>
      {#if recents.length}
        <div class="mt-7">
          <div
            class="mb-3 text-[9px] font-semibold uppercase tracking-widest opacity-40"
          >
            Recent
          </div>
          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {#each recents as recent}<button
                type="button"
                class="flex items-center gap-3 rounded-lg border border-[#1f150c]/[.08] p-3 text-left dark:border-[#e1dcc9]/[.07]"
                on:click={() => openFolder(recent.path, recent.name)}
                ><Folder size={15} /><span class="min-w-0"
                  ><b class="block truncate text-[10px]">{recent.name}</b><small
                    class="block truncate text-[9px] opacity-35"
                    >{recent.path}</small
                  ></span
                ></button
              >{/each}
          </div>
        </div>
      {/if}
    </div>
  {:else if mode === "files"}
    <div class="grid h-full min-h-0 lg:grid-cols-[210px_1fr]">
      <aside
        class="hidden min-h-0 overflow-y-auto border-r border-[#1f150c]/[.10] pr-3 lg:block dark:border-[#e1dcc9]/[.08]"
      >
        <div
          class="mb-2 px-2 text-[9px] font-semibold uppercase tracking-widest opacity-40"
        >
          Files
        </div>
        <button
          type="button"
          class="flex w-full gap-2 rounded-lg px-2 py-2 text-left text-[10px] hover:bg-[#412d15]/[.06]"
          on:click={() => openFolder(".", "Home")}
          ><Home size={13} /> Home</button
        >
        {#each favorites as favorite}<button
            type="button"
            class="flex w-full gap-2 rounded-lg px-2 py-2 text-left text-[10px] hover:bg-[#412d15]/[.06]"
            on:click={() => openFavorite(favorite)}
            >{#if (favorite.type ?? "directory") === "directory"}<FolderOpen
                size={13}
              />{:else}<File size={13} />{/if}<span class="truncate"
              >{favorite.name}</span
            ></button
          >{/each}
      </aside>
      <div class="min-w-0 min-h-0 overflow-y-auto pl-0 lg:pl-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div class="flex h-8 min-w-0 flex-1 items-center gap-1">
            <button
              type="button"
              class="h-7 w-7 shrink-0 rounded-md text-[#1f150c]/[.45] hover:bg-[#412d15]/[.08] hover:text-[#1f150c] disabled:opacity-20 dark:text-[#e1dcc9]/[.40] dark:hover:bg-white/[.06] dark:hover:text-[#e1dcc9]"
              on:click={goBack}
              disabled={!historyBack.length}
              aria-label="Back"
              title="Back"><ArrowLeft size={14} /></button
            ><button
              type="button"
              class="h-7 w-7 shrink-0 rounded-md text-[#1f150c]/[.45] hover:bg-[#412d15]/[.08] hover:text-[#1f150c] disabled:opacity-20 dark:text-[#e1dcc9]/[.40] dark:hover:bg-white/[.06] dark:hover:text-[#e1dcc9]"
              on:click={goForward}
              disabled={!historyForward.length}
              aria-label="Forward"
              title="Forward"><ArrowRight size={14} /></button
            ><div class="flex h-8 min-w-0 flex-1 items-center gap-1 rounded-lg border border-[#1f150c]/[.12] bg-white/[.16] px-2.5 dark:border-white/[.10] dark:bg-white/[.025]">
            <button
              type="button"
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#1f150c]/[.72] hover:bg-[#412d15]/[.08] dark:text-[#e1dcc9]/[.70] dark:hover:bg-white/[.06]"
              on:click={() => open(".")} aria-label="Home" title="Home"><Home size={12} /></button>
            <button
              type="button"
              class="h-7 shrink-0 rounded-md px-1.5 font-mono text-[10px] text-[#1f150c]/[.72] hover:bg-[#412d15]/[.08] dark:text-[#e1dcc9]/[.70] dark:hover:bg-white/[.06]"
              on:click={() => open(".")}>/home</button
            >{#if path !== "."}{#each path
                .split("/")
                .filter(Boolean) as segment, index}<span class="opacity-25"
                  >/</span
                ><button
                  type="button"
                  class="shrink-0 rounded-md px-1.5 py-1 font-mono text-[10px] text-[#1f150c]/[.72] hover:bg-[#412d15]/[.08] dark:text-[#e1dcc9]/[.70] dark:hover:bg-white/[.06]"
                  on:click={() =>
                    open(
                      path
                        .split("/")
                        .filter(Boolean)
                        .slice(0, index + 1)
                        .join("/"),
                    )}>{segment}</button
                >{/each}{/if}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <label
              class="flex h-8 w-full max-w-md items-center gap-2 rounded-lg border border-[#1f150c]/[.12] bg-white/[.16] px-2.5 transition focus-within:border-[#412d15]/[.28] focus-within:bg-white/[.24] dark:border-white/[.10] dark:bg-white/[.025] dark:focus-within:border-white/[.18] dark:focus-within:bg-white/[.04]"
              ><Search
                size={13}
                class="shrink-0 text-[#1f150c]/[.42] dark:text-[#e1dcc9]/[.38]"
              /><input
                bind:value={fileSearch}
                class="min-w-0 flex-1 bg-transparent text-[10px] text-[#1f150c]/[.82] outline-none placeholder:text-[#1f150c]/[.35] dark:text-[#e1dcc9]/[.82] dark:placeholder:text-[#e1dcc9]/[.30]"
                placeholder="Search in this folder"
                aria-label="Search files"
              /></label
            >
            <div
              class="flex shrink-0 items-center rounded-lg border border-[#1f150c]/[.12] bg-white/[.16] p-0.5 dark:border-white/[.10] dark:bg-white/[.025]"
              role="group"
              aria-label="File view"
            >
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-md transition {fileView ===
                'list'
                  ? 'bg-[#412d15] text-[#e1dcc9]'
                  : 'text-[#1f150c]/[.45] hover:bg-[#412d15]/[.08] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.40] dark:hover:bg-white/[.06] dark:hover:text-[#e1dcc9]'}"
                on:click={() => setFileView("list")}
                aria-label="List view"
                title="List view"><List size={14} /></button
              >
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-md transition {fileView ===
                'grid'
                  ? 'bg-[#412d15] text-[#e1dcc9]'
                  : 'text-[#1f150c]/[.45] hover:bg-[#412d15]/[.08] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.40] dark:hover:bg-white/[.06] dark:hover:text-[#e1dcc9]'}"
                on:click={() => setFileView("grid")}
                aria-label="Grid view"
                title="Grid view"><LayoutGrid size={14} /></button>
            </div>
            <div class="relative shrink-0">
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-[#1f150c]/[.45] transition hover:bg-[#412d15]/[.08] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.40] dark:hover:bg-white/[.06] dark:hover:text-[#e1dcc9]"
                on:click={toggleViewMenu}
                aria-label="View options"
                aria-expanded={openViewMenu}
                title="View options"
              >
                <MoreVertical size={14} />
              </button>
              {#if openViewMenu}
                <div
                  class="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-lg border border-[#1f150c]/[.12] bg-[#e1dcc9] py-1 shadow-[0_12px_30px_rgba(0,0,0,.18)] dark:border-white/[.12] dark:bg-[#141416] dark:shadow-[0_12px_30px_rgba(0,0,0,.45)]"
                >
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[10px] text-[#1f150c]/[.78] hover:bg-[#412d15]/[.08] dark:text-[#e1dcc9]/[.78] dark:hover:bg-white/[.06]"
                    on:click={() => setShowHiddenFiles(!showHiddenFiles)}
                  >
                    <span>{showHiddenFiles ? "Hide hidden files" : "Show hidden files"}</span>
                    <span class="text-[9px] opacity-50">{showHiddenFiles ? "On" : "Off"}</span>
                  </button>
                </div>
              {/if}
            </div>

          </div>
        </div>
          {#if fileView === "list"}
            <div
              class="overflow-hidden rounded-xl border border-[#1f150c]/[.10] bg-white/[.18] dark:border-white/[.10] dark:bg-white/[.02]"
            >
              <div
                class="grid grid-cols-[1fr_100px_150px] gap-3 border-b border-[#1f150c]/[.08] px-4 py-2 text-[9px] font-medium uppercase tracking-wider text-[#1f150c]/[.45] dark:border-white/[.08] dark:text-[#e1dcc9]/[.42]"
              >
                <span>Name</span><span>Type / Size</span><span
                  class="text-right">Modified</span
                >
              </div>
              {#each visibleItems as item}
                {@const itemPath = folderPath(item.name)}
                <div
                  class="group grid w-full grid-cols-[1fr_100px_150px] items-center gap-3 border-b border-[#1f150c]/[.07] px-4 py-2.5 last:border-0 hover:bg-[#412d15]/[.045] dark:border-white/[.07] dark:hover:bg-white/[.035]"
                >
                  <button
                    type="button"
                    class="flex min-w-0 items-center gap-2 text-left text-[#1f150c]/[.82] dark:text-[#e1dcc9]/[.82]"
                    on:click={() => openItem(item)}
                  >
                    {#if item.type === "directory"}<Folder
                        size={14}
                      />{:else if isPreviewable(item.name)}<Image
                        size={14}
                        class="opacity-65"
                      />{:else}<File size={14} class="opacity-50" />{/if}<span
                      class="truncate text-[11px]">{item.name}</span
                    >
                  </button>
                  <span
                    class="text-[9px] text-[#1f150c]/[.48] dark:text-[#e1dcc9]/[.42]"
                    >{item.type === "directory"
                      ? "Directory"
                      : formatSize(item.size)}</span
                  >
                  <div class="flex items-center justify-end gap-2">
                    <span
                      class="text-[9px] text-[#1f150c]/[.48] dark:text-[#e1dcc9]/[.42]"
                      >{formatDate(item.modified)}</span
                    ><button
                      type="button"
                      class="rounded p-1 text-[#1f150c]/[.35] hover:bg-[#412d15]/[.08] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.35] dark:hover:bg-white/[.06] dark:hover:text-[#e1dcc9]"
                      on:click={() =>
                        toggleFavorite(itemPath, item.name, item.type)}
                      aria-label={isFavorite(itemPath)
                        ? "Remove favorite"
                        : "Add favorite"}
                      ><Star
                        size={13}
                        class={isFavorite(itemPath) ? "fill-current" : ""}
                      /></button
                    >
                  </div>
                </div>
              {:else}<div
                  class="p-8 text-center text-[10px] text-[#1f150c]/[.42] dark:text-[#e1dcc9]/[.38]"
                >
                  {fileSearch ? "No matching files." : "This folder is empty."}
                </div>{/each}
            </div>
          {:else}
            <div
              class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            >
              {#each visibleItems as item}
                {@const itemPath = folderPath(item.name)}
                <div
                  class="group relative min-w-0 rounded-xl border border-[#1f150c]/[.10] bg-white/[.18] p-4 transition hover:bg-[#412d15]/[.045] dark:border-white/[.10] dark:bg-white/[.02] dark:hover:bg-white/[.035]"
                >
                  <button
                    type="button"
                    class="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-[#1f150c]/[.35] hover:bg-[#412d15]/[.08] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.35] dark:hover:bg-white/[.06] dark:hover:text-[#e1dcc9]"
                    on:click|stopPropagation={() => toggleItemMenu(itemPath)}
                    aria-label="Item actions"
                    aria-expanded={openItemMenu === itemPath}
                  >
                    <MoreVertical size={14} />
                  </button>
                  {#if openItemMenu === itemPath}
                    <div
                      class="absolute right-2 top-9 z-20 w-36 overflow-hidden rounded-lg border border-[#1f150c]/[.12] bg-[#e1dcc9] py-1 shadow-[0_12px_30px_rgba(0,0,0,.18)] dark:border-white/[.12] dark:bg-[#141416] dark:shadow-[0_12px_30px_rgba(0,0,0,.45)]"
                    >
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] text-[#1f150c]/[.78] hover:bg-[#412d15]/[.08] dark:text-[#e1dcc9]/[.78] dark:hover:bg-white/[.06]"
                        on:click={() => {
                          toggleFavorite(itemPath, item.name, item.type);
                          openItemMenu = "";
                        }}
                      >
                        <Star size={13} class={isFavorite(itemPath) ? "fill-current" : ""} />
                        {isFavorite(itemPath) ? "Remove favorite" : "Add favorite"}
                      </button>
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] text-[#1f150c]/[.78] hover:bg-[#412d15]/[.08] dark:text-[#e1dcc9]/[.78] dark:hover:bg-white/[.06]"
                        on:click={() => editItem(item)}
                      >
                        <Pencil size={13} />
                        {item.type === "directory" ? "Open folder" : "Edit"}
                      </button>
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] text-red-700 hover:bg-red-500/[.08] dark:text-red-300"
                        on:click={() => void deleteItem(item)}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  {/if}
                  <button
                    type="button"
                    class="flex min-w-0 w-full items-center gap-3 pr-7 text-left text-[#1f150c]/[.82] dark:text-[#e1dcc9]/[.82]"
                    on:click={() => openItem(item)}
                  >
                    <span
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#412d15]/[.07] text-[#1f150c]/[.62] dark:bg-white/[.05] dark:text-[#e1dcc9]/[.62] {item.name.startsWith('.') ? 'opacity-55' : ''}"
                      >{#if item.type === "directory"}<Folder
                          size={17}
                        />{:else if isPreviewable(item.name)}<Image
                          size={17}
                          class="opacity-65"
                        />{:else}<File
                          size={17}
                          class="opacity-50"
                        />{/if}</span
                    >
                    <span class="min-w-0 truncate text-[11px] {item.name.startsWith('.') ? 'opacity-55' : ''}"
                      >{item.name}</span
                    >
                  </button>
                </div>
              {:else}<div
                  class="col-span-full p-8 text-center text-[10px] text-[#1f150c]/[.42] dark:text-[#e1dcc9]/[.38]"
                >
                  {fileSearch ? "No matching files." : "This folder is empty."}
                </div>{/each}
            </div>
          {/if}
      </div>
    </div>
  {:else}
    <div class="flex h-full min-h-0 flex-col">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-[13px] font-semibold">Editor</h2>
          <p class="mt-1 text-[10px] opacity-45">
            {editorRoot || "No project opened"}
          </p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px]"
            on:click={() => openPicker("file")}
            ><File size={13} /> Open File</button
          >
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px]"
            on:click={() => openPicker("folder")}
            ><Folder size={13} /> Open Folder</button
          >
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg bg-[#412d15] px-3 py-2 text-[10px] text-[#e1dcc9] disabled:opacity-40"
            on:click={() => void saveEditor()}
            disabled={!editorDirty || editorSaving}
            ><Save size={13} /> {editorSaving ? "Saving…" : "Save"}</button
          >
        </div>
      </div>
      <div
        class="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-[#1f150c]/[.10] dark:border-[#e1dcc9]/[.08] lg:grid-cols-[220px_1fr]"
      >
        <aside
          class="min-h-0 overflow-y-auto border-r p-3 dark:border-[#e1dcc9]/[.08]"
        >
          <div
            class="mb-2 px-2 text-[9px] font-semibold uppercase tracking-wider opacity-40"
          >
            {projectLabel}
          </div>
          {#each items as item}<button
              type="button"
              class="flex w-full gap-2 rounded-md px-2 py-1.5 text-left text-[10px] hover:bg-[#412d15]/[.06]"
              on:click={() =>
                item.type === "directory"
                  ? navigateTo(folderPath(item.name))
                  : void loadFile(folderPath(item.name), item.name)}
              >{#if item.type === "directory"}<Folder size={13} />{:else}<File
                  size={13}
                  class="opacity-45"
                />{/if}<span class="truncate">{item.name}</span></button
            >{/each}
          {#if !editorRoot}<div class="p-4 text-center text-[9px] opacity-40">
              Open a file or folder to start.
            </div>{/if}
        </aside>
        <div class="min-w-0 min-h-0">
          <div
            class="flex h-10 items-center justify-between border-b px-3 dark:border-[#e1dcc9]/[.08]"
          >
            <span class="truncate text-[10px]"
              >{editorName || "No file selected"}{editorDirty ? " •" : ""}</span
            >{#if editorError}<span class="truncate text-[9px] text-red-700"
                >{editorError}</span
              >{/if}
          </div>
          {#if editorLoading}<div class="p-6 text-[10px] opacity-45">
              Opening file…
            </div>
          {:else if editorPath}<textarea
              bind:value={editorContent}
              on:keydown={onEditorKeydown}
              spellcheck="false"
              class="h-[calc(100%-40px)] w-full resize-none bg-transparent p-4 font-mono text-[11px] leading-5 outline-none"
              aria-label={editorName}
            ></textarea>
          {:else}<div
              class="flex h-[calc(100%-40px)] items-center justify-center text-center opacity-40"
            >
              <div>
                <Code2 size={25} class="mx-auto" />
                <p class="mt-2 text-[10px]">
                  Select a file or open one from the file picker.
                </p>
              </div>
            </div>{/if}
        </div>
      </div>
    </div>
  {/if}
  {#if previewPath}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px] dark:bg-black/60"
      role="presentation"
      on:click={(event) =>
        event.currentTarget === event.target && clearPreview()}
    >
      <div
        class="flex h-[min(82vh,760px)] w-[min(92vw,1100px)] min-w-0 flex-col overflow-hidden rounded-xl border border-[#1f150c]/[.18] bg-[#e1dcc9] shadow-[0_24px_80px_rgba(0,0,0,.28)] dark:border-white/[.16] dark:bg-[#0b0b0d] dark:shadow-[0_24px_80px_rgba(0,0,0,.55)]"
      >
        <div
          class="flex h-10 shrink-0 items-center justify-between border-b border-[#1f150c]/[.10] bg-[#d8d2bf] px-3 dark:border-white/[.09] dark:bg-[#111114]"
        >
          <div class="flex min-w-0 items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-[#b35b4b]"></span><span
              class="h-2.5 w-2.5 rounded-full bg-[#b18a45]"
            ></span><span class="h-2.5 w-2.5 rounded-full bg-[#5f9467]"
            ></span><span
              class="ml-2 truncate text-[11px] font-medium text-[#1f150c]/[.78] dark:text-[#e1dcc9]/[.78]"
              >{previewName}</span
            >
          </div>
          <button
            type="button"
            class="rounded-md p-1.5 text-[#1f150c]/[.48] hover:bg-[#1f150c]/[.07] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.42] dark:hover:bg-white/[.07] dark:hover:text-[#e1dcc9]"
            on:click={clearPreview}
            aria-label="Close preview"><X size={15} /></button
          >
        </div>
        <div
          class="min-h-0 flex-1 overflow-auto bg-[#eee9dc] dark:bg-[#08080a]"
        >
          {#if previewKind === "image"}<div
              class="flex min-h-full items-center justify-center p-6"
            >
              <img
                src={previewUrl(previewPath)}
                alt={previewName}
                class="max-h-full max-w-full object-contain"
              />
            </div>
          {:else if previewKind === "pdf"}<iframe
              title={previewName}
              src={previewUrl(previewPath)}
              class="h-full min-h-[500px] w-full border-0"
            ></iframe>
          {:else if previewKind === "video"}<div
              class="flex min-h-full items-center justify-center p-6"
            >
              <video
                controls
                src={previewUrl(previewPath)}
                class="max-h-full max-w-full"><track kind="captions" /></video
              >
            </div>
          {:else if previewKind === "audio"}<div
              class="flex min-h-full items-center justify-center p-8"
            >
              <div
                class="w-full max-w-xl rounded-xl border border-[#1f150c]/[.10] bg-[#e1dcc9] p-6 dark:border-white/[.10] dark:bg-[#111114]"
              >
                <div
                  class="mb-5 text-center text-[11px] font-medium text-[#1f150c]/[.72] dark:text-[#e1dcc9]/[.72]"
                >
                  {previewName}
                </div>
                <audio controls src={previewUrl(previewPath)} class="w-full"
                ></audio>
              </div>
            </div>{/if}
        </div>
      </div>
    </div>
  {/if}

  {#if pickerOpen}
    <div
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/[.55] p-4 backdrop-blur-[2px]"
      role="presentation"
      on:click={(event) =>
        event.target === event.currentTarget && closePicker()}
    >
      <div
        class="flex h-[min(78vh,680px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#1f150c]/[.16] bg-[#e1dcc9] shadow-[0_24px_80px_rgba(0,0,0,.3)] dark:border-[#e1dcc9]/[.10] dark:bg-[#11100f]"
        role="dialog"
        aria-label="Select file or folder"
      >
        <header
          class="flex items-center justify-between border-b px-4 py-3 dark:border-[#e1dcc9]/[.08]"
        >
          <div>
            <h3 class="text-[12px] font-semibold">
              {pickerMode === "file" ? "Open File" : "Open Folder"}
            </h3>
            <p class="mt-1 font-mono text-[9px] opacity-40">
              {pickerPath === "." ? "/home" : "/home/" + pickerPath}
            </p>
          </div>
          <button type="button" on:click={closePicker} aria-label="Close"
            ><X size={15} /></button
          >
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <div class="mb-3 flex items-center gap-2">
            <button
              type="button"
              class="flex items-center gap-1 rounded-md border px-2 py-1.5 text-[9px]"
              on:click={() => {
                const parts = pickerPath.split("/").filter(Boolean);
                readPicker(
                  parts.length ? parts.slice(0, -1).join("/") || "." : ".",
                );
              }}><ArrowLeft size={12} /> Back</button
            ><Search size={13} class="opacity-35" /><span
              class="text-[9px] opacity-40">Select a {pickerMode}</span
            >
          </div>
          {#if pickerError}<div class="p-8 text-center text-[10px] opacity-50">
              {pickerError}
            </div>
          {:else if pickerLoading}<div class="space-y-2">
              {#each Array(8) as _}<div
                  class="h-9 animate-pulse rounded-lg bg-black/[.04] dark:bg-white/[.04]"
                ></div>{/each}
            </div>
          {:else}{#each pickerItems as item}<button
                type="button"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#412d15]/[.06]"
                on:click={() => void choosePicker(item)}
                >{#if item.type === "directory"}<Folder size={15} />{:else}<File
                    size={15}
                    class="opacity-50"
                  />{/if}<span class="text-[10px]">{item.name}</span
                >{#if item.type === "file"}<span
                    class="ml-auto text-[9px] opacity-35"
                    >{formatSize(item.size)}</span
                  >{/if}</button
              >{/each}{/if}
        </div>
        <footer
          class="flex justify-end gap-2 border-t px-4 py-3 dark:border-[#e1dcc9]/[.08]"
        >
          <button
            type="button"
            class="rounded-lg border px-3 py-2 text-[9px]"
            on:click={closePicker}>Cancel</button
          >
        </footer>
      </div>
    </div>
  {/if}
</div>
