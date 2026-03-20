"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { useGateway } from "@/context/gateway-context";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Terminal, Search, Trash2, Download, RefreshCw, 
  ArrowDownCircle, Database, Filter, ChevronDown, Clock,
  AlertCircle, ShieldAlert, Bug, Info, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

interface LogEntry {
  raw: string;
  time?: string | null;
  level?: LogLevel | null;
  subsystem?: string | null;
  message: string;
  meta?: any;
}

const LEVELS: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];

const LEVEL_COLORS: Record<string, string> = {
  trace: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  debug: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  info: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  warn: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  error: "text-red-500 bg-red-500/10 border-red-500/20",
  fatal: "text-rose-600 bg-rose-600/20 border-rose-600/30 font-bold",
};

export default function LogsPage() {
  const { client, connected } = useGateway();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [filterText, setFilterText] = useState("");
  const [autoFollow, setAutoFollow] = useState(true);
  const [excludedLevels, setExcludedLevels] = useState<Set<LogLevel>>(new Set());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  const parseLogLine = (line: string): LogEntry => {
    if (!line.trim()) return { raw: line, message: line };
    try {
      const obj = JSON.parse(line);
      const meta = obj?._meta || {};
      const time = obj.time || meta.date || null;
      const level = (meta.logLevelName || meta.level || "info").toLowerCase() as LogLevel;
      
      const contextCandidate = obj["0"] || meta.name || null;
      let subsystem = null;
      try {
        if (contextCandidate && typeof contextCandidate === 'string' && contextCandidate.startsWith("{")) {
          const cObj = JSON.parse(contextCandidate);
          subsystem = cObj.subsystem || cObj.module || null;
        }
      } catch {}
      if (!subsystem && contextCandidate && contextCandidate.length < 100) subsystem = contextCandidate;

      let message = obj["1"] || obj.message || line;
      if (typeof message === 'object') message = JSON.stringify(message);

      return { raw: line, time, level, subsystem, message };
    } catch {
      return { raw: line, message: line };
    }
  };

  const fetchLogs = async (isReset = false) => {
    if (!client || !connected) return;
    if (isReset) setLoading(true);
    try {
      const res: any = await client.request("logs.tail", {
        cursor: isReset ? undefined : (cursor ?? undefined),
        limit: 1000,
        maxBytes: 1000000
      });
      
      const lines = Array.isArray(res.lines) ? res.lines : [];
      const newEntries = lines.map(parseLogLine);
      
      setEntries(prev => {
        const combined = isReset ? newEntries : [...prev, ...newEntries];
        return combined.slice(-2000);
      });
      
      if (typeof res.cursor === "number") setCursor(res.cursor);
    } catch (err: any) {
      if (isReset) toast({ title: "加载日志失败", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
    return () => clearInterval(timerRef.current);
  }, [client, connected]);

  useEffect(() => {
    if (autoFollow) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => fetchLogs(false), 3000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [autoFollow, cursor]);

  useEffect(() => {
    if (autoFollow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoFollow]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (e.level && excludedLevels.has(e.level)) return false;
      if (!filterText) return true;
      const term = filterText.toLowerCase();
      return (
        e.message.toLowerCase().includes(term) ||
        (e.subsystem?.toLowerCase().includes(term)) ||
        e.raw.toLowerCase().includes(term)
      );
    });
  }, [entries, filterText, excludedLevels]);

  const toggleLevel = (level: LogLevel) => {
    const next = new Set(excludedLevels);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    setExcludedLevels(next);
  };

  const handleExport = () => {
    const content = filteredEntries.map(e => e.raw).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openclaw-logs-${new Date().toISOString()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col animate-in fade-in duration-500 overflow-hidden">
      {/* Search & Statistics Bar */}
      <div className="px-3 sm:px-8 py-1.5 sm:py-4 border-b bg-background/50 backdrop-blur-xl flex items-center justify-between gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="p-1 sm:p-2 bg-emerald-500/10 rounded-lg">
              <Terminal className="size-3.5 sm:size-5 text-emerald-500" />
            </div>
            <h1 className="text-xs sm:text-xl font-bold whitespace-nowrap">日志</h1>
          </div>
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="搜索流水..." 
              className="pl-9 h-8 sm:h-9 rounded-lg sm:rounded-xl border-border/50 bg-muted/20 text-xs sm:text-sm"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-3">
          <div className="flex items-center gap-1 border-r pr-1.5 sm:pr-4 mr-0.5 sm:mr-1 shrink-0">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap">追踪</span>
            <Switch 
              checked={autoFollow} 
              onCheckedChange={setAutoFollow} 
              className="scale-[0.65] sm:scale-75"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => fetchLogs(true)} disabled={loading} className="h-7 w-7 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl border-border/50">
              <RefreshCw className={cn("size-3.5 sm:size-4", loading && "animate-spin")} />
              <span className="hidden sm:inline ml-2">刷新</span>
            </Button>
            <Button variant="outline" size="icon" onClick={handleExport} className="h-7 w-7 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl border-border/50">
              <Download className="size-3.5 sm:size-4" />
              <span className="hidden sm:inline ml-2">导出</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setEntries([])} className="h-7 w-7 sm:h-9 rounded-lg sm:rounded-xl text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5 sm:size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Level Filter Bar */}
      <div className="px-3 sm:px-8 py-1 sm:py-2 border-b bg-muted/10 flex items-center gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap shrink-0 scrollbar-hide">
        <Filter className="hidden sm:block size-3.5 text-muted-foreground mr-1 shrink-0" />
        {LEVELS.map(level => (
          <button
            key={level}
            onClick={() => toggleLevel(level)}
            className={cn(
              "px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border transition-all",
              !excludedLevels.has(level) 
                ? LEVEL_COLORS[level]
                : "bg-background text-muted-foreground/30 border-transparent scale-90"
            )}
          >
            {level}
          </button>
        ))}
        <div className="ml-auto hidden sm:flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
          <div className="flex items-center gap-1.5"><Activity className="size-3" /> 流速: {entries.length}/2000</div>
          {cursor && <div className="flex items-center gap-1.5"><Database className="size-3" /> 偏移: {cursor.toString(16).toUpperCase()}</div>}
        </div>
      </div>

      {/* Main Log Terminal Container */}
      <div className="flex-1 px-1 sm:px-8 pb-1 sm:pb-8 overflow-hidden bg-muted/10">
        <div 
          ref={scrollRef}
          className="h-full rounded-lg sm:rounded-2xl border border-white/5 bg-[#0a0a0a] font-mono text-[10px] sm:text-xs leading-relaxed selection:bg-emerald-500/30 overflow-y-auto scrollbar-hide sm:scrollbar-default"
        >
          <div className="p-2 sm:p-6 space-y-0.5 min-h-full pb-20">
            {filteredEntries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20 grayscale py-40">
                <Activity className="size-12 stroke-1" />
                <p className="text-sm">暂无匹配的系统日志流</p>
              </div>
            ) : (
              filteredEntries.map((e, idx) => (
                <div key={idx} className="flex gap-1 sm:gap-4 group hover:bg-white/5 px-1 sm:px-2 -mx-2 transition-colors border-l-2 border-transparent hover:border-emerald-500/50">
                  <span className="text-zinc-600 shrink-0 select-none w-12 sm:w-16 text-[9px] sm:text-right opacity-50 group-hover:opacity-100 transition-opacity">
                    {e.time ? new Date(e.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "--"}
                  </span>
                  
                  <span className={cn(
                    "shrink-0 px-1 rounded h-fit min-w-[32px] sm:min-w-[48px] text-center uppercase text-[8px] sm:text-[10px] font-bold mt-0.5",
                    e.level ? LEVEL_COLORS[e.level].split(' ')[0] : "text-zinc-500"
                  )}>
                    {e.level || "INFO"}
                  </span>

                  {e.subsystem && (
                    <span className="shrink-0 text-emerald-500/70 group-hover:text-emerald-400 font-bold">
                      [{e.subsystem}]
                    </span>
                  )}

                  <span className={cn(
                    "flex-1 break-all whitespace-pre-wrap",
                    e.level === "error" || e.level === "fatal" ? "text-red-400" : 
                    e.level === "warn" ? "text-amber-200" : "text-zinc-300"
                  )}>
                    {e.message.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')}
                  </span>

                  <div className="opacity-0 group-hover:opacity-100 shrink-0 flex items-center gap-2">
                    <button 
                      onClick={() => navigator.clipboard.writeText(e.raw)}
                      className="p-1 hover:bg-white/10 rounded text-zinc-500 transition-all font-sans"
                      title="复制原始 JSON"
                    >
                      <Download className="size-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
            {autoFollow && (
              <div className="flex items-center gap-2 text-[10px] text-emerald-500/30 animate-pulse mt-8 border-t border-white/5 pt-4">
                <div className="size-1 w-2 bg-emerald-500/30 rounded-full" />
                实时日志监听中，已加载最新区块。
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Sticky Bottom Scroll Info */}
      {!autoFollow && (
        <button 
          onClick={() => setAutoFollow(true)}
          className="fixed bottom-4 sm:bottom-12 right-4 sm:right-12 bg-emerald-600 text-white p-2 sm:p-3 rounded-full shadow-2xl shadow-emerald-600/50 hover:bg-emerald-700 transition-all animate-bounce"
        >
          <ArrowDownCircle className="size-5 sm:size-6" />
        </button>
      )}
    </div>
  );
}
