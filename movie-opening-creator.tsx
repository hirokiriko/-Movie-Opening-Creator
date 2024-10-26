'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { X, Play, Pause, Square, SkipForward, Film, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"

type Slide = {
  id: string
  type: 'image' | 'text'
  content: string
  duration: number
  style?: {
    fontSize?: number
    color?: string
    fontFamily?: string
  }
}

type GeneratedVideo = {
  id: string
  title: string
  thumbnail: string
  createdAt: Date
  slides: Slide[]
}

const AnimatedSlide: React.FC<{ slide: Slide; onComplete: () => void; isVisible: boolean }> = ({ slide, onComplete, isVisible }) => {
  const slideRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        if (slideRef.current) {
          slideRef.current.style.opacity = '0'
        }
        setTimeout(onComplete, 500) // Fade out duration
      }, slide.duration * 1000 - 500) // Start fade out 500ms before the end

      return () => clearTimeout(timer)
    }
  }, [slide, onComplete, isVisible])

  if (!isVisible) return null

  return (
    <div
      ref={slideRef}
      className="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
      style={{ opacity: 1 }}
    >
      {slide.type === 'image' ? (
        <img src={slide.content} alt="Slide" className="max-w-full max-h-full object-contain" />
      ) : (
        <p style={{
          fontSize: `${slide.style?.fontSize}px`,
          color: slide.style?.color,
          fontFamily: slide.style?.fontFamily
        }} className="text-center p-4 w-full">
          {slide.content}
        </p>
      )}
    </div>
  )
}

export default function Component() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentText, setCurrentText] = useState('')
  const [fontSize, setFontSize] = useState(24)
  const [fontColor, setFontColor] = useState('#FFFFFF')
  const [fontFamily, setFontFamily] = useState('Arial')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])
  const [title, setTitle] = useState('')
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)
  const [isAnimationModalOpen, setIsAnimationModalOpen] = useState(false)
  const [currentAnimationIndex, setCurrentAnimationIndex] = useState(0)
  const [currentPlayingSlides, setCurrentPlayingSlides] = useState<Slide[]>([])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const remainingSlots = 5 - slides.filter(slide => slide.type === 'image').length
      const filesToUpload = Array.from(files).slice(0, remainingSlots)
      filesToUpload.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          setSlides(prev => [...prev, {
            id: Date.now().toString(),
            type: 'image',
            content: e.target?.result as string,
            duration: 3
          }])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const handleTextAdd = () => {
    if (currentText.trim()) {
      setSlides(prev => [...prev, {
        id: Date.now().toString(),
        type: 'text',
        content: currentText,
        duration: 3,
        style: {
          fontSize,
          color: fontColor,
          fontFamily
        }
      }])
      setCurrentText('')
    }
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return
    const items = Array.from(slides)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    setSlides(items)
  }

  const handleRemoveSlide = (id: string) => {
    setSlides(prev => prev.filter(slide => slide.id !== id))
  }

  const handleDurationChange = (id: string, duration: number) => {
    setSlides(prev => prev.map(slide =>
      slide.id === id ? { ...slide, duration } : slide
    ))
  }

  const handlePreview = () => {
    setIsPreviewOpen(true)
    setCurrentSlideIndex(0)
    setIsPlaying(true)
    setRemainingTime(slides[0]?.duration || 0)
  }

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev)
  }

  const handleStop = () => {
    setIsPlaying(false)
    setCurrentSlideIndex(0)
    setRemainingTime(slides[0]?.duration || 0)
  }

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1)
      setRemainingTime(slides[currentSlideIndex + 1].duration)
    } else {
      handleStop()
    }
  }

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying && slides.length > 0) {
      timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev > 0.1) {
            return prev - 0.1
          } else {
            handleNext()
            return slides[(currentSlideIndex + 1) % slides.length]?.duration || 0
          }
        })
      }, 100)
    }
    return () => clearInterval(timer)
  }, [isPlaying, currentSlideIndex, slides])

  const renderPreviewContent = () => {
    return (
      <div className="relative w-full h-[60vh] bg-black">
        {slides.map((slide, index) => (
          <AnimatedSlide
            key={slide.id}
            slide={slide}
            onComplete={handleNext}
            isVisible={index === currentSlideIndex}
          />
        ))}
      </div>
    )
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)

    // モックアップの非同期処理
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setExportProgress(i)
    }

    // 新しい動画をリストに追加
    const newVideo: GeneratedVideo = {
      id: Date.now().toString(),
      title: title || `動画 ${generatedVideos.length + 1}`,
      thumbnail: '/placeholder.svg?height=100&width=180',
      createdAt: new Date(),
      slides: JSON.parse(JSON.stringify(slides)) // スライドの完全なディープコピーを保存
    }
    setGeneratedVideos(prev => [...prev, newVideo])

    setIsExporting(false)
    toast({
      title: "動画の出力が完了しました",
      description: "動画ファイルがダウンロードされます。",
    })
    setTitle('')
  }

  const handleDeleteVideo = (id: string) => {
    setGeneratedVideos(prev => prev.filter(video => video.id !== id))
  }

  const handlePlayAnimation = (videoId: string) => {
    const video = generatedVideos.find(v => v.id === videoId)
    if (video) {
      setCurrentPlayingSlides(video.slides)
      setIsAnimationModalOpen(true)
      setCurrentAnimationIndex(0)
      setIsPlaying(true)
    }
  }

  const handleAnimationComplete = () => {
    if (currentAnimationIndex < currentPlayingSlides.length - 1) {
      setCurrentAnimationIndex(prev => prev + 1)
    } else {
      setIsAnimationModalOpen(false)
      setCurrentAnimationIndex(0)
      setCurrentPlayingSlides([])
      setIsPlaying(false)
      toast({
        title: "アニメーションの再生が完了しました",
        description: "すべてのスライドが表示されました。",
      })
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">映画風オープニングクリエーター</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>タイトル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title-input">動画のタイトル</Label>
                <Input
                  id="title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="タイトルを入力してください"
                />
              </div>
            </div>
          </CardContent>
          <CardHeader>
            <CardTitle>コンテンツ追加</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-upload">画像をアップロード</Label>
                <Input id="image-upload" type="file" accept="image/*" multiple onChange={handleImageUpload} />
                {slides.filter(slide => slide.type === 'image').length >= 5 && (
                  <p className="text-red-500 text-sm mt-2">画像は最大5枚までアップロードできます。</p>
                )}
              </div>

              <div>
                <Label htmlFor="text-input">テキストを入力</Label>
                <Textarea
                  id="text-input"
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  placeholder="テキストを入力してください"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="font-size">フォントサイズ</Label>
                  <Input
                    id="font-size"
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    min={8}
                    max={72}
                  />
                </div>
                <div>
                  <Label htmlFor="font-color">フォント色</Label>
                  <Input
                    id="font-color"
                    type="color"
                    value={fontColor}
                    onChange={(e) => setFontColor(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="font-family">フォント</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger id="font-family">
                      <SelectValue placeholder="フォントを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Verdana">Verdana</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Courier">Courier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleTextAdd}>テキストを追加</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>スライドの順序と設定</CardTitle>
          </CardHeader>
          <CardContent>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="slides">
                {(provided) => (
                  <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {slides.map((slide, index) => (
                      <Draggable key={slide.id} draggableId={slide.id} index={index}>
                        {(provided) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex items-center justify-between p-2 bg-gray-100 rounded"
                          >
                            <span className="truncate flex-1">
                              {slide.type === 'image' ? '画像' : slide.content}
                            </span>
                            <div className="flex items-center space-x-2">
                              <Slider
                                value={[slide.duration]}
                                min={1}
                                max={10}
                                step={0.5}
                                onValueChange={(value) => handleDurationChange(slide.id, value[0])}
                                className="w-24"
                              />
                              <span  className="text-sm">{slide.duration}秒</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveSlide(slide.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 space-y-4">
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogTrigger asChild>
            <Button onClick={handlePreview} className="w-full">
              <Play className="mr-2 h-4 w-4" /> プレビュー
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <h2 className="text-xl font-bold mb-4">プレビュー</h2>
            {renderPreviewContent()}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex space-x-2">
                <Button onClick={handlePlayPause}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button onClick={handleStop}>
                  <Square className="h-4 w-4" />
                </Button>
                <Button onClick={handleNext}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm">
                スライド {currentSlideIndex + 1} / {slides.length} 
                (残り {remainingTime.toFixed(1)}秒)
              </div>
            </div>
            <Progress value={(currentSlideIndex / slides.length) * 100} className="mt-2" />
          </DialogContent>
        </Dialog>

        <Button onClick={handleExport} 
                className="w-full"
                disabled={isExporting || slides.length === 0}>
          <Film className="mr-2 h-4 w-4" /> 動画を出力
        </Button>

        {isExporting && (
          <div className="space-y-2">
            <Progress value={exportProgress} className="w-full" />
            <p className="text-center text-sm text-gray-500">動画を出力中... {exportProgress}%</p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">生成した動画一覧</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {generatedVideos.map((video) => (
            <Card key={video.id}>
              <CardContent className="p-4">
                <img src={video.thumbnail} alt={video.title} className="w-full h-auto mb-2 rounded" />
                <h3 className="font-semibold">{video.title}</h3>
                <p className="text-sm text-gray-500">{video.createdAt.toLocaleString()}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => handlePlayAnimation(video.id)}>
                  <Play className="mr-2 h-4 w-4" /> 再生
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteVideo(video.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> 削除
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isAnimationModalOpen} onOpenChange={setIsAnimationModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <h2 className="text-xl font-bold mb-4">動画プレビュー</h2>
          <div className="relative w-full h-[60vh] bg-black">
            {currentPlayingSlides.map((slide, index) => (
              <AnimatedSlide
                key={slide.id}
                slide={slide}
                onComplete={handleAnimationComplete}
                isVisible={index === currentAnimationIndex}
              />
            ))}
          </div>
          <Progress value={(currentAnimationIndex / currentPlayingSlides.length) * 100} className="mt-4" />
        </DialogContent>
      </Dialog>
    </div>
  )
}