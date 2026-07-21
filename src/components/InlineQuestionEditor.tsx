import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaUploader } from "@/components/MediaUploader";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";

export interface LocalQuestion {
  id: string;
  type: "mcq" | "true_false" | "essay";
  text: string;
  points: number;
  hint: string;
  model: string;
  explanation: string;
  explanationImageUrl: string | null;
  explanationAudioUrl: string | null;
  explanationVideoUrl: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  options: LocalOption[];
}

export interface LocalOption {
  id: string;
  text: string;
  is_correct: boolean;
  imageUrl: string | null;
  videoUrl: string | null;
}

let _qId = 0;
let _oId = 0;
export function freshQuestion(type: "mcq" | "true_false" | "essay" = "mcq"): LocalQuestion {
  const q: LocalQuestion = {
    id: `q_${++_qId}`,
    type,
    text: "",
    points: 1,
    hint: "",
    model: "A",
    explanation: "",
    explanationImageUrl: null,
    explanationAudioUrl: null,
    explanationVideoUrl: null,
    imageUrl: null,
    audioUrl: null,
    videoUrl: null,
    options: [],
  };
  if (type === "true_false") {
    q.options = [
      { id: `o_${++_oId}`, text: "صح", is_correct: true, imageUrl: null, videoUrl: null },
      { id: `o_${++_oId}`, text: "خطأ", is_correct: false, imageUrl: null, videoUrl: null },
    ];
  } else if (type === "mcq") {
    q.options = [
      { id: `o_${++_oId}`, text: "", is_correct: true, imageUrl: null, videoUrl: null },
      { id: `o_${++_oId}`, text: "", is_correct: false, imageUrl: null, videoUrl: null },
    ];
  }
  return q;
}

export function freshOption(): LocalOption {
  return { id: `o_${++_oId}`, text: "", is_correct: false, imageUrl: null, videoUrl: null };
}

interface Props {
  question: LocalQuestion;
  index: number;
  onChange: (q: LocalQuestion) => void;
  onDelete: () => void;
  bucket: string;
}

export function InlineQuestionEditor({ question, index, onChange, onDelete, bucket }: Props) {
  const q = question;
  const set = (patch: Partial<LocalQuestion>) => onChange({ ...q, ...patch });

  const setOption = (oid: string, patch: Partial<LocalOption>) => {
    set({ options: q.options.map((o) => (o.id === oid ? { ...o, ...patch } : o)) });
  };

  const markCorrect = (oid: string) => {
    set({ options: q.options.map((o) => ({ ...o, is_correct: o.id === oid })) });
  };

  const addOption = () => {
    set({ options: [...q.options, freshOption()] });
  };

  const removeOption = (oid: string) => {
    if (q.options.length <= 2) return;
    set({ options: q.options.filter((o) => o.id !== oid) });
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <Badge>س {index}</Badge>
            <Select value={q.type} onValueChange={(v: any) => {
              const nq = freshQuestion(v);
              onChange({ ...nq, id: q.id, text: q.text, points: q.points, model: q.model });
            }}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">اختيار من متعدد</SelectItem>
                <SelectItem value="true_false">صح/خطأ</SelectItem>
                <SelectItem value="essay">مقالي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={q.model} onValueChange={(v) => set({ model: v })}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="النموذج" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">نموذج أ</SelectItem>
                <SelectItem value="B">نموذج ب</SelectItem>
                <SelectItem value="C">نموذج ج</SelectItem>
                <SelectItem value="D">نموذج د</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div>
          <Label>نص السؤال</Label>
          <Textarea value={q.text} onChange={(e) => set({ text: e.target.value })} rows={2} placeholder="اكتب السؤال..." />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-lg border border-dashed bg-muted/20">
          <MediaUploader
            bucket={bucket}
            pathPrefix={prefix}
            value={{ image: q.imageUrl, audio: q.audioUrl, video: q.videoUrl }}
            onChange={({ image, audio, video }) => set({ imageUrl: image ?? q.imageUrl, audioUrl: audio ?? q.audioUrl, videoUrl: video ?? q.videoUrl })}
          />
          <div className="space-y-2">
            <div><Label className="text-xs">الدرجة</Label><Input type="number" min={0} value={q.points} onChange={(e) => set({ points: Number(e.target.value) || 1 })} /></div>
            <div><Label className="text-xs">تلميح (اختياري)</Label><Input value={q.hint} onChange={(e) => set({ hint: e.target.value })} placeholder="يظهر أثناء الحل" /></div>
          </div>
        </div>

        {(q.type === "mcq" || q.type === "true_false") && (
          <div className="space-y-2 border rounded-md p-3 bg-muted/20">
            <Label className="text-sm font-semibold">الاختيارات (اختر الصحيح)</Label>
            {q.options.map((o) => (
              <div key={o.id} className="flex items-start gap-2">
                <input type="radio" checked={o.is_correct} onChange={() => markCorrect(o.id)} className="mt-2.5 h-4 w-4 shrink-0" />
                <div className="flex-1 space-y-1">
                  <Input
                    value={o.text}
                    onChange={(e) => setOption(o.id, { text: e.target.value })}
                    placeholder={q.type === "true_false" ? (o.is_correct ? "صح" : "خطأ") : `اختيار`}
                    disabled={q.type === "true_false"}
                    className={q.type === "true_false" ? "opacity-70" : ""}
                  />
                  <div className="flex items-center gap-1">
                    <label className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                      <span className="text-[10px]">🖼</span> صورة
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        if (f.size > 5 * 1024 * 1024) return;
                        const result = await uploadToCloudinary(f, bucket);
                        setOption(o.id, { imageUrl: result.secure_url });
                      }} />
                    </label>
                    {o.imageUrl && <button type="button" onClick={() => setOption(o.id, { imageUrl: null })} className="text-destructive text-[10px]">✕</button>}
                  </div>
                </div>
                {q.type === "mcq" && q.options.length > 2 && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeOption(o.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {q.type === "mcq" && (
              <Button size="sm" variant="outline" onClick={addOption} className="gap-1"><Plus className="h-3 w-3" /> اختيار</Button>
            )}
          </div>
        )}

        <div className="space-y-2 p-3 rounded-lg border border-dashed bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <Label className="text-xs text-blue-700 dark:text-blue-300 font-semibold">شرح الإجابة (يظهر بعد الحل)</Label>
          <Textarea value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} rows={2} placeholder="اكتب شرح الإجابة الصحيحة..." />
          <div className="grid sm:grid-cols-3 gap-2">
            <MediaUploader
              bucket={bucket}
              pathPrefix={`${prefix}/explanation`}
              value={{ image: q.explanationImageUrl, audio: q.explanationAudioUrl, video: q.explanationVideoUrl }}
              onChange={({ image, audio, video }) => set({ explanationImageUrl: image ?? q.explanationImageUrl, explanationAudioUrl: audio ?? q.explanationAudioUrl, explanationVideoUrl: video ?? q.explanationVideoUrl })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
