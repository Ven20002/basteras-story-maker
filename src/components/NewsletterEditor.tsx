import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NewsletterData {
  title: string;
  news1Title: string;
  news1Content: string;
  news1Image: File | null;
  news2Title: string;
  news2Content: string;
  news2Image: File | null;
  officeNewsTitle: string;
  officeNewsContent: string;
}

export const NewsletterEditor = () => {
  const [data, setData] = useState<NewsletterData>({
    title: "Bästerås Weekly",
    news1Title: "News1",
    news1Content: "",
    news1Image: null,
    news2Title: "News2",
    news2Content: "",
    news2Image: null,
    officeNewsTitle: "Office News",
    officeNewsContent: "",
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = (field: 'news1Image' | 'news2Image', file: File | null) => {
    if (file && !file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }
    setData(prev => ({ ...prev, [field]: file }));
  };

  const handleGeneratePDF = async () => {
    if (!data.news1Content || !data.news2Content || !data.officeNewsContent) {
      toast.error("Please fill in all content fields");
      return;
    }

    setIsGenerating(true);
    try {
      // Upload images to Supabase Storage if provided
      let news1ImagePath = null;
      let news2ImagePath = null;

      if (data.news1Image) {
        news1ImagePath = `newsletter-images/${Date.now()}-news1-${data.news1Image.name}`;
        const { error: uploadError1 } = await supabase.storage
          .from('newsletter-assets')
          .upload(news1ImagePath, data.news1Image);
        if (uploadError1) {
          console.error('Error uploading news1 image:', uploadError1);
        }
      }

      if (data.news2Image) {
        news2ImagePath = `newsletter-images/${Date.now()}-news2-${data.news2Image.name}`;
        const { error: uploadError2 } = await supabase.storage
          .from('newsletter-assets')
          .upload(news2ImagePath, data.news2Image);
        if (uploadError2) {
          console.error('Error uploading news2 image:', uploadError2);
        }
      }

      // Call edge function to generate PDF
      const { data: result, error } = await supabase.functions.invoke('generate-newsletter-pdf', {
        body: {
          title: data.title,
          news1: {
            title: data.news1Title,
            content: data.news1Content,
            imagePath: news1ImagePath,
          },
          news2: {
            title: data.news2Title,
            content: data.news2Content,
            imagePath: news2ImagePath,
          },
          officeNews: {
            title: data.officeNewsTitle,
            content: data.officeNewsContent,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Download the PDF
      const pdfBlob = new Blob([new Uint8Array(result.pdf.data)], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("PDF generated successfully!");
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error(error.message || "Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-2">
            <FileText className="w-8 h-8 text-accent" />
            Newsletter Editor
          </h1>
          <p className="text-muted-foreground">Create your newsletter and generate a beautiful PDF</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Newsletter Title</CardTitle>
            <CardDescription>The main title of your newsletter</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={data.title}
              onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Bästerås Weekly"
              className="text-lg font-semibold"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>News Article 1</CardTitle>
            <CardDescription>First featured article with image</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="news1-title">Title</Label>
              <Input
                id="news1-title"
                value={data.news1Title}
                onChange={(e) => setData(prev => ({ ...prev, news1Title: e.target.value }))}
                placeholder="Article title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news1-content">Content</Label>
              <Textarea
                id="news1-content"
                value={data.news1Content}
                onChange={(e) => setData(prev => ({ ...prev, news1Content: e.target.value }))}
                placeholder="Write your article content..."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news1-image">Image (Optional - Coming Soon)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="news1-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload('news1Image', e.target.files?.[0] || null)}
                  className="cursor-pointer"
                  disabled
                />
                {data.news1Image && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Upload className="w-4 h-4" />
                    {data.news1Image.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Image support will be added in a future update</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>News Article 2</CardTitle>
            <CardDescription>Second featured article with image</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="news2-title">Title</Label>
              <Input
                id="news2-title"
                value={data.news2Title}
                onChange={(e) => setData(prev => ({ ...prev, news2Title: e.target.value }))}
                placeholder="Article title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news2-content">Content</Label>
              <Textarea
                id="news2-content"
                value={data.news2Content}
                onChange={(e) => setData(prev => ({ ...prev, news2Content: e.target.value }))}
                placeholder="Write your article content..."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news2-image">Image (Optional - Coming Soon)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="news2-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload('news2Image', e.target.files?.[0] || null)}
                  className="cursor-pointer"
                  disabled
                />
                {data.news2Image && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Upload className="w-4 h-4" />
                    {data.news2Image.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Image support will be added in a future update</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Office News</CardTitle>
            <CardDescription>General office updates and announcements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="office-title">Title</Label>
              <Input
                id="office-title"
                value={data.officeNewsTitle}
                onChange={(e) => setData(prev => ({ ...prev, officeNewsTitle: e.target.value }))}
                placeholder="Office News"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="office-content">Content</Label>
              <Textarea
                id="office-content"
                value={data.officeNewsContent}
                onChange={(e) => setData(prev => ({ ...prev, officeNewsContent: e.target.value }))}
                placeholder="Write your office news..."
                rows={6}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-4 pb-8">
          <Button
            size="lg"
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="min-w-[200px]"
          >
            {isGenerating ? (
              <>Generating PDF...</>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
