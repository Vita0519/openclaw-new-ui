"use client";
import { useEffect, useState, useMemo } from "react";
import { useGateway } from "@/context/gateway-context";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Zap, RefreshCw, Search, Box, Info, AlertTriangle, 
  CheckCircle2, Download, ShieldCheck, Key, ExternalLink,
  ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";



export default function SkillsPage() {
  const { client, connected } = useGateway();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    "built-in": true,
    "workspace": false
  });

  const fetchData = async () => {
    if (!client || !connected) return;
    setLoading(true);
    try {
      const res = await client.request("skills.status", {});
      setReport(res);
    } catch (err: any) {
      toast({ title: "加载技能失败", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [client, connected]);

  const skills = useMemo(() => {
    const list = report?.skills || [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((item: any) => 
      item.name.toLowerCase().includes(s) || 
      item.description.toLowerCase().includes(s) || 
      item.skillKey.toLowerCase().includes(s)
    );
  }, [report, search]);

  const groups = useMemo(() => {
    const map: Record<string, { label: string, items: any[] }> = {
      "workspace": { label: "工作区技能 (Workspace)", items: [] },
      "managed": { label: "托管技能 (Managed)", items: [] },
      "built-in": { label: "内置技能 (Built-in)", items: [] },
      "other": { label: "其他技能 (Other)", items: [] }
    };

    skills.forEach((skill: any) => {
      const source = skill.source || "";
      if (source.startsWith("workspace")) map["workspace"].items.push(skill);
      else if (source.startsWith("openclaw-managed")) map["managed"].items.push(skill);
      else if (source.startsWith("openclaw-bundled")) map["built-in"].items.push(skill);
      else map["other"].items.push(skill);
    });

    return Object.entries(map).filter(([_, group]) => group.items.length > 0);
  }, [skills]);

  const toggleSkill = async (skillKey: string, currentDisabled: boolean) => {
    if (!client) return;
    setBusyKey(skillKey);
    try {
      await client.request("skills.update", { skillKey, enabled: currentDisabled });
      toast({ title: currentDisabled ? "已开启该技能" : "已停用该技能" });
      fetchData();
    } catch (err: any) {
      toast({ title: "操作失败", description: err.message, variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  const saveKey = async (skillKey: string) => {
    if (!client) return;
    const apiKey = edits[skillKey];
    if (apiKey === undefined) return;
    setBusyKey(skillKey);
    try {
      await client.request("skills.update", { skillKey, apiKey });
      toast({ title: "配置已保存", description: "API Key 已成功更新。" });
      fetchData();
    } catch (err: any) {
      toast({ title: "保存失败", description: err.message, variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  const installSkill = async (skill: any) => {
    if (!client) return;
    setBusyKey(skill.skillKey);
    try {
      const option = skill.install[0];
      const res: any = await client.request("skills.install", {
        name: skill.name,
        installId: option.id,
        timeoutMs: 120000
      });
      toast({ title: "安装成功", description: res.message || "技能依赖已安装。" });
      fetchData();
    } catch (err: any) {
      toast({ title: "安装失败", description: err.message, variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">扩展技能 (Skills)</h1>
          <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
            管理当前开启的扩展插件及三方工具箱。
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 sm:size-4 text-muted-foreground" />
            <Input 
              placeholder="搜索名称..." 
              className="pl-8 w-full sm:w-[280px] h-8 sm:h-10 text-xs bg-background/50 rounded-lg sm:rounded-xl" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl shrink-0">
            <RefreshCw className={cn("size-3.5 sm:size-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {groups.length === 0 && !loading && (
          <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-muted/20 opacity-60">
            <Zap className="size-12 mx-auto mb-4 stroke-1" />
            <p>未找到符合条件的技能</p>
          </div>
        )}

        {groups.map(([id, group]) => (
          <div key={id} className="space-y-2 sm:space-y-4">
            <button 
              onClick={() => setCollapsedGroups(prev => ({ ...prev, [id]: !prev[id] }))}
              className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-tighter sm:tracking-widest px-1 hover:text-foreground transition-colors group"
            >
              {collapsedGroups[id] ? <ChevronDown className="size-2.5 sm:size-3" /> : <ChevronUp className="size-2.5 sm:size-3" />}
              {group.label}
              <span className="ml-1.5 bg-muted px-1 py-0.5 rounded text-[9px] opacity-60 group-hover:opacity-100 transition-opacity">
                {group.items.length}
              </span>
            </button>
            
            {!collapsedGroups[id] && (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                {group.items.map((skill: any) => (
                  <Card key={skill.skillKey} className="group relative overflow-hidden bg-background/50 border-border/50 hover:border-primary/30 transition-all duration-300 rounded-xl">
                    <div className="p-2.5 sm:p-6 space-y-2 sm:space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-1 sm:gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                            <span className="text-sm sm:text-lg">{skill.emoji || "🧩"}</span>
                            <h3 className="font-bold text-[11px] sm:text-base truncate">{skill.name}</h3>
                          </div>
                          <p className="hidden sm:block text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                            {skill.description}
                          </p>
                        </div>
                        <Switch 
                          checked={!skill.disabled} 
                          onCheckedChange={(checked = false) => toggleSkill(skill.skillKey, skill.disabled)}
                          disabled={busyKey === skill.skillKey}
                          className="data-[state=checked]:bg-emerald-500 scale-[0.65] sm:scale-90 -mr-2 sm:mr-0"
                        />
                      </div>

                      {/* Status Chips */}
                      <div className="flex flex-wrap gap-1 sm:gap-1.5">
                        {skill.disabled ? (
                          <Badge variant="secondary" className="opacity-70 text-[7px] sm:text-[10px] px-1 sm:px-2 py-0">已停用</Badge>
                        ) : (
                          <Badge variant="success" className="text-[7px] sm:text-[10px] px-1 sm:px-2 py-0">已启用</Badge>
                        )}
                        {skill.bundled && <Badge variant="outline" className="text-[7px] sm:text-[10px] px-1 sm:px-2 py-0">内置</Badge>}
                        {skill.eligible === false && <Badge variant="warning" className="text-[7px] sm:text-[10px] px-1 sm:px-2 py-0 font-bold">不可用</Badge>}
                      </div>

                      {/* Requirements / Missing */}
                      {(skill.missing.bins.length > 0 || skill.missing.env.length > 0 || skill.missing.config.length > 0) && (
                        <div className="p-1.5 sm:p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-1.5 text-[8px] sm:text-[11px] font-bold text-amber-500 uppercase tracking-tight">
                            <AlertTriangle className="size-2.5 sm:size-3" />
                            环境缺失
                          </div>
                          <div className="flex flex-wrap gap-0.5 sm:gap-1">
                            {skill.missing.bins.map((b: string) => <Badge key={b} variant="destructive" className="text-[7px] sm:text-[9px] py-0 px-1">Bin: {b}</Badge>)}
                            {skill.missing.env.map((e: string) => <Badge key={e} variant="warning" className="text-[7px] sm:text-[9px] py-0 px-1">ENV: {e}</Badge>)}
                            {skill.missing.config.map((c: string) => <Badge key={c} variant="destructive" className="text-[7px] sm:text-[9px] py-0 px-1">Cfg: {c}</Badge>)}
                          </div>
                          {skill.install.length > 0 && skill.missing.bins.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full h-6 sm:h-7 text-[8px] sm:text-[10px] gap-1 sm:gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-600"
                              onClick={() => installSkill(skill)}
                              disabled={busyKey === skill.skillKey}
                            >
                              <Download className="size-2.5 sm:size-3" />
                              安装依赖
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Config Area (API Key) */}
                      {skill.primaryEnv && (
                        <div className="space-y-1.5 sm:space-y-2 pt-1.5 sm:pt-2 border-t border-border/30">
                          <div className="flex items-center justify-between">
                            <label className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase truncate pr-1">
                              {skill.primaryEnv}
                            </label>
                            {skill.homepage && (
                              <a href={skill.homepage} target="_blank" rel="noreferrer" className="text-[8px] sm:text-[10px] text-primary flex items-center gap-1 hover:underline shrink-0">
                                获取 <ExternalLink className="size-2 sm:size-2" />
                              </a>
                            )}
                          </div>
                          <div className="flex gap-1 sm:gap-2">
                            <Input 
                              type="password" 
                              placeholder="贴入..." 
                              className="h-6 sm:h-8 text-[10px] sm:text-xs bg-muted/30 px-2"
                              value={edits[skill.skillKey] ?? ""}
                              onChange={(e) => setEdits(prev => ({ ...prev, [skill.skillKey]: e.target.value }))}
                            />
                            <Button 
                              size="sm" 
                              className="h-6 w-6 sm:h-8 sm:w-8 p-0 shrink-0"
                              onClick={() => saveKey(skill.skillKey)}
                              disabled={busyKey === skill.skillKey || edits[skill.skillKey] === undefined}
                            >
                              <Key className="size-2.5 sm:size-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
