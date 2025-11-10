import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, news1, news2, officeNews } = await req.json();

    console.log('Generating newsletter PDF with data:', { title, news1, news2, officeNews });

    // Create LaTeX document
    const latexContent = `\\documentclass[10pt,a4paper]{article}

% Geometry
\\setlength\\topmargin{-48pt}
\\setlength\\headheight{0pt}
\\setlength\\headsep{25pt}
\\setlength\\marginparwidth{-20pt}
\\setlength\\textwidth{7.0in}
\\setlength\\textheight{9.5in}
\\setlength\\oddsidemargin{-30pt}
\\setlength\\evensidemargin{-30pt}
\\frenchspacing

% Packages
\\usepackage[english]{babel}
\\usepackage{graphicx,amssymb,amsmath}
\\usepackage{multicol}
\\setlength{\\columnsep}{1cm}
\\usepackage{url,wrapfig,microtype,tcolorbox}
\\usepackage[absolute,overlay]{textpos}
\\usepackage{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage{xcolor}
\\usepackage{pagecolor}

% Colors
\\definecolor{Black}{RGB}{25,25,25}
\\definecolor{PageBackground}{HTML}{F9F7F3}
\\definecolor{NewsBoxColor}{HTML}{EBE6DF}
\\definecolor{AccentOrange}{HTML}{FFA600}

% Page Style
\\pagecolor{PageBackground}
\\color{Black}

% Custom Commands
\\newcommand{\\NewsletterTitle}[1]{%
    {\\fontsize{45}{42}\\selectfont\\bfseries #1}}
\\newcommand{\\NewsletterHeader}[1]{%
    {\\fontsize{20}{21}\\selectfont\\bfseries #1}}
\\newcommand{\\NewsletterBody}[1]{%
    {\\fontsize{10}{15}\\selectfont #1}}

\\begin{document}
\\thispagestyle{empty}

% Header: Title
\\noindent
\\NewsletterTitle{${title.replace('Weekly', '\\textcolor{AccentOrange}{Weekly}')}}

\\vspace{0.3cm}

% News Section
\\begin{tcolorbox}[
    colback=NewsBoxColor,
    arc=0pt,
    boxrule=0pt,
    left=14pt, right=14pt,
    top=10pt, bottom=10pt,
    width=\\linewidth,
    height=\\dimexpr\\textheight-4cm\\relax,
    valign=top
]

\\begin{multicols}{2}

% Article 1
\\NewsletterHeader{${news1.title}}\\\\[0.3cm]
\\NewsletterBody{
${news1.content}
}

\\vspace{0.8cm}

% Article 2
\\NewsletterHeader{${news2.title}}\\\\[0.3cm]
\\NewsletterBody{
${news2.content}
}

\\vspace{0.8cm}

% Office News
\\NewsletterHeader{${officeNews.title}}\\\\[0.3cm]
\\NewsletterBody{
${officeNews.content}
}

\\end{multicols}
\\end{tcolorbox}

% Footer
\\begin{textblock*}{\\textwidth}(-1cm,27cm)
    \\begin{center}
        \\footnotesize
        \\textcolor{gray!90}{
            Thanks for reading this week's edition of ${title}.\\\\
            If you have feedback, suggestions, or interesting topics, feel free to reach out.
        }
    \\end{center}
\\end{textblock*}

\\end{document}`;

    console.log('LaTeX content generated');

    // Use LaTeX.Online API to compile
    const compileUrl = 'https://latexonline.cc/compile';
    
    const formData = new FormData();
    formData.append('file', new Blob([latexContent], { type: 'text/plain' }), 'newsletter.tex');
    
    console.log('Sending to LaTeX compiler...');
    
    const compileResponse = await fetch(compileUrl, {
      method: 'POST',
      body: formData,
    });

    if (!compileResponse.ok) {
      const errorText = await compileResponse.text();
      console.error('LaTeX compilation error:', errorText);
      throw new Error(`LaTeX compilation failed: ${compileResponse.status} - ${errorText}`);
    }

    const pdfBuffer = await compileResponse.arrayBuffer();
    console.log('PDF generated successfully, size:', pdfBuffer.byteLength);

    return new Response(
      JSON.stringify({ 
        pdf: { 
          data: Array.from(new Uint8Array(pdfBuffer)) 
        } 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-newsletter-pdf:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate PDF' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
