import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import knightecLogo from "@/assets/knightec-logo.png";

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

  const getImageDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const wrapText = (text: string, maxWidth: number, doc: jsPDF): string[] => {
    const lines: string[] = [];
    const words = text.split(' ');
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const textWidth = doc.getTextWidth(testLine);
      
      if (textWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  const handleGeneratePDF = async () => {
    if (!data.news1Content || !data.news2Content || !data.officeNewsContent) {
      toast.error("Please fill in all content fields");
      return;
    }

    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors matching the LaTeX template
      const bgColor: [number, number, number] = [249, 247, 243];
      const boxColor: [number, number, number] = [235, 230, 223];
      const accentOrange: [number, number, number] = [255, 166, 0];
      const textBlack: [number, number, number] = [25, 25, 25];

      // Background
      doc.setFillColor(...bgColor);
      doc.rect(0, 0, 210, 297, 'F');

      // Title
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textBlack);
      const titleParts = data.title.split(' ');
      let titleX = 20;
      titleParts.forEach((part, index) => {
        if (index === titleParts.length - 1) {
          doc.setTextColor(...accentOrange);
        }
        doc.text(part, titleX, 25);
        titleX += doc.getTextWidth(part + ' ');
      });

      // Load logo to get natural dimensions and calculate proper aspect ratio
      const img = new Image();
      img.src = knightecLogo;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Calculate logo dimensions maintaining aspect ratio
      const logoDesiredWidth = 60;
      const logoAspectRatio = img.naturalWidth / img.naturalHeight;
      const logoHeight = logoDesiredWidth / logoAspectRatio;
      
      // Add logo at top right with proper aspect ratio
      doc.addImage(knightecLogo, 'PNG', 210 - logoDesiredWidth - 15, 10, logoDesiredWidth, logoHeight);

      // News box background
      doc.setFillColor(...boxColor);
      doc.rect(10, 35, 190, 240, 'F');

      let yPos = 50;
      const columnWidth = 85;
      const leftColumn = 20;
      const rightColumn = 110;

      // News 1 - Left Column
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textBlack);
      
      // Add image for news 1 if available
      if (data.news1Image) {
        try {
          const imageData = await getImageDataUrl(data.news1Image);
          doc.addImage(imageData, 'JPEG', leftColumn, yPos, 60, 40);
          yPos += 45;
        } catch (error) {
          console.error('Error adding news1 image:', error);
        }
      }

      doc.text(data.news1Title, leftColumn, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const news1Lines = wrapText(data.news1Content, columnWidth, doc);
      news1Lines.forEach(line => {
        doc.text(line, leftColumn, yPos);
        yPos += 5;
      });

      // News 2 - Right Column
      yPos = 50;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(data.news2Title, rightColumn, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const news2Lines = wrapText(data.news2Content, columnWidth, doc);
      news2Lines.forEach(line => {
        doc.text(line, rightColumn, yPos);
        yPos += 5;
      });

      // Add image for news 2 if available
      if (data.news2Image) {
        try {
          yPos += 3;
          const imageData = await getImageDataUrl(data.news2Image);
          doc.addImage(imageData, 'JPEG', rightColumn, yPos, 70, 45);
          yPos += 50;
        } catch (error) {
          console.error('Error adding news2 image:', error);
        }
      }

      // Office News - Continue in right column or wrap to left if needed
      yPos += 10;
      if (yPos > 240) {
        yPos = 180;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(data.officeNewsTitle, leftColumn, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const officeLines = wrapText(data.officeNewsContent, columnWidth, doc);
        officeLines.forEach(line => {
          doc.text(line, leftColumn, yPos);
          yPos += 5;
        });
      } else {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(data.officeNewsTitle, rightColumn, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const officeLines = wrapText(data.officeNewsContent, columnWidth, doc);
        officeLines.forEach(line => {
          doc.text(line, rightColumn, yPos);
          yPos += 5;
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Thanks for reading this week's edition of ${data.title}.`, 105, 285, { align: 'center' });
      doc.text('If you have feedback, suggestions, or interesting topics, feel free to reach out.', 105, 290, { align: 'center' });

      // Add logo at bottom right with proper aspect ratio (same size as top, aligned with text)
      const bottomLogoDesiredWidth = 60;
      const bottomLogoHeight = bottomLogoDesiredWidth / logoAspectRatio;
      doc.addImage(knightecLogo, 'PNG', 210 - bottomLogoDesiredWidth - 15, 290 - (bottomLogoHeight / 2), bottomLogoDesiredWidth, bottomLogoHeight);

      // Save PDF
      doc.save(`${data.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
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
        <div className="text-center space-y-2 relative">
          <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-2">
            <FileText className="w-8 h-8 text-accent" />
            Newsletter Editor
          </h1>
          <p className="text-muted-foreground">Create your newsletter and generate a beautiful PDF</p>
          <img 
            src={knightecLogo} 
            alt="Knightec Group" 
            className="absolute top-0 right-0 h-8 w-auto"
          />
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
              <Label htmlFor="news1-image">Image (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="news1-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload('news1Image', e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                {data.news1Image && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Upload className="w-4 h-4" />
                    {data.news1Image.name}
                  </span>
                )}
              </div>
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
              <Label htmlFor="news2-image">Image (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="news2-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload('news2Image', e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                {data.news2Image && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Upload className="w-4 h-4" />
                    {data.news2Image.name}
                  </span>
                )}
              </div>
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
