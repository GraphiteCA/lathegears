    // lathegears.html - combined xhtml and Javascript to calculate gear trains for lathes. 
    // version 1.2.3
    //
    // Copyright: (c) Carl Williams 2011
    //
    // This program is free software: you can redistribute it and/or modify
    // it under the terms of the GNU General Public License as published by
    // the Free Software Foundation, either version 3 of the License, or
    // (at your option) ny later version.
    //
    // This program is distributed in the hope that it will be useful,
    // but WITHOUT ANY WARRANTY; without even the implied warranty of
    // MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    // GNU General Public License for more details.
    // 
    // You should have received a copy of the GNU General Public License
    // along with this program.  If not, see <http://www.gnu.org/licenses/>.
    //
    // About:
    //
    // Javascript goes through all permutations of the screw cutting gears in a set,
    // searching for combinations which give a specified thread pitch, given either
    // in threads per inch or as a pitch in millimetres. The code omits duplicates and
    // attempts, unless told otherwise, to weed out particularly silly combinations.
    // The core search strategy is pretty crude - this is running on the client's
    // browser, and everyone has CPU to spare these days. The only concession to 
    // optimisation is in get_my_gears(), where the gears array is explicitly 
    // populated with integers (the naive behaviour is to fill it with strings).
    // This saves enough conversions throughout to reduce the execution time quite 
    // dramatically. Other stuff which is coded very inefficiently tends only to happen
    // now and again, none of the other inefficiencies really matter from a practical
    // perspective.
    //
    // Aside from these comments at the start, there are more or less no comments to
    // to explain anything. It is almost guaranteed that you can find more elegant 
    // ways of doing pretty much everything in here.
    //
    // Changes:
    // 2020-03-06: Changed functions get_my_gears() and default_gears() so that it uses a split from the textbox from the html,
    //              Also default values are handled via the html, allowing eventual removal of original "my gears" 28 text boxes...
    // 2020-02-23: Changed Leadscrew from a dropdown to a textbox, added seperate TPI/MM pitch dropdown - Jeff Pedlow
    // 2020-02-15: Forked / Moved JS to its own file / moved images into a subfolder - Jeff Pedlow
    // Previous:   existed from https://lathenovice.wordpress.com/  / http://www.imagesalad.com/lathenovice/lathegears/lathegears.html
    //             no updates in 5+ years, GPLv3.
    // 2015-12-15: Added more leadscrew options.
    // 2011-12-01: V1.1 patches to make it "sort of" work with Opera 9 - manually add indexOf
    //             method to results array, change all colour specs to 6 digit form,
    //             adjust gear image position to allow for peculiar table resizing.
    //             Fixed issue with z index syntax in image drawing bit.  
    //             Added browser compatibility warning.
    // 2011-12-01: V1.2 sort results if poss, put some limits on closeness for error
    //             display to avoid "1 thou out in 3 parsecs" syndrome.
    // 2011-12-02: fix leftover diagnostic-related bug causing duplicate results.
    // 
    //
    
    // Here are some things you can tweak without diving into the code:
    
    // Default gear set. This is the standard change gear set supplied with a typical 
    // imperial leadscrew 300mm (7x12) minilathe
    var strDefaultGears="20,20,30,35,40,40,45,50,55,57,60,65,80,0";
    
    // ILX and ILY are the distances in mm in X and Y between the input shaft and the leadscrew 
    // shaft, equivalent to millimetres (ish). Used for on-screen representation of gear layout, 
    // and some rudimentary and partial checking to see if gear combination will fit.
    var ILX = 38;
    var ILY = 70;
    
    // amount to the right for the front-view part of the little gears picture (pixels)
    var GEAR_PIC_FRONTVIEW_X = 120;
    
    // Everything further down is less obvious than the above.
    // globals
    var arrMyGears=[];
    var arrResults=[];
    var numresults=0;
    var minDiffIdx=0;
    var maxDiffIdx=0;
    var minDiff=100000000;
    var maxDiff=0;
    var TGPITCH = 0;
    var NOINNERHTML = false;
    var NOINDEXOF = false;
    var NOSORT = false;
    var IMAGEPROBLEMS = false;
    var TABLEPROBLEMS = false;
    var BROWSER = "";
    
    var ILD = Math.sqrt((ILX * ILX) + (ILY * ILY));
    
    // overridden later
    var GEAR_PIC_X = 320; 
    var GEAR_PIC_Y = 320;
    var GPFVX = GEAR_PIC_X + 50 + GEAR_PIC_FRONTVIEW_X;
    
    // images made to variables, and PNGs moved to images folder
    var redcircle = "images/redcircle.png"
    var greencircle = "images/greencircle.png"
    var bluecircle = "images/bluecircle.png"
    var cyancircle = "images/cyancircle.png"
    var red = "images/red.png"
    var green = "images/green.png"
    var cyan = "images/cyan.png"
    var blue = "images/blue.png"

    // begin functions

    function get_my_gears()
    {
        
        arrMyGears = document.getElementById("geartext").value.split(",");
        //var i, x, j;
    
        //arrMyGears = [];
        
        //for (i=0, j=0; i<28; ++i)
       // {
         //   x = document.forms['mylathe'].elements[i].value;
            
          //  if (x > 0)
           // {
          //      arrMyGears[j] = parseInt(x);
          //      j++;
         //   }
      //  }
    }
    
    function getPos(e)
    {
        var t = 0, l = 0;
        while(e)
        {
            t += e.offsetTop;
            l += e.offsetLeft;
            e = e.offsetParent;
        }
        return [l, t];
    }
    
    function update_tpi()
    {
        var tgp = document.getElementById("tgtpitch");
        var ttpi = tgp.value;
        if(numresults > 0)
        {
            tgp.value = 25.4/ttpi;
        }
    }
    
    function intersection(x0, y0, r0, x1, y1, r1)
    {
      var a, dx, dy, d, h, r02, rx, ry, x2, y2, xi1, xi2, xi, yi;
    
      dx = x1 - x0;
      dy = y1 - y0;
      r02 = r0 * r0;
      xi = 0;
      yi = 0;
    
      d = Math.sqrt((dx * dx) + (dy * dy));
    
      if ((d <= (r0 + r1)) && ( d >= Math.abs(r0 - r1)))
      {
          a = (r02 - (r1*r1) + (d*d)) / (d + d) ;
        
          x2 = x0 + (dx * a/d);
          y2 = y0 + (dy * a/d);
        
          h = Math.sqrt(r02 - (a*a));
        
          rx = -dy * (h/d);
          ry = dx * (h/d);
        
          xi1 = x2 + rx;
          xi2 = x2 - rx;
        
          if(xi2 > xi1) // use leftmost of two intersection points
          {
              xi = xi1;
              yi = y2 + ry;
          }
          else
          {
              xi = xi2;
              yi = y2 - ry;
          }
      }
      return [xi, yi]; 
    }
    
    function check_browser()
    {
        var bwarn, i, presto = 0;
        var bname, bversion;
        var wstring;
        var testarray = [];
    
        bwarn = document.getElementById("bwarnn");
    
        if(typeof(testarray.indexOf) != "function")
        {
            NOINDEXOF = true;
        }
    
        if(typeof(testarray.sort) != "function")
        {
            NOSORT = true;
        }
    
        if(typeof(bwarn.innerHTML) != "string")
        {
            NOINNERHTML = true;
        }
    
        bname = navigator.appName;
        bversion = parseFloat(navigator.appVersion);
    
        bstring = bname + " " + bversion;
    
        if(bname == "Opera") 
        {
            // Opera 11.52 reports appVersion 9.80. Opera 9.2 messes the table up.
            if(bversion < 9.8)
            {
                TABLEPROBLEMS = true;
                IMAGEPROBLEMS = true;
            }
            wstring = navigator.userAgent;
            testarray = wstring.split("/");
            for(i = 0; testarray[i] != null; i++) ; // deliberately empty
    
            if(i > 1)
            {
                if(testarray[i - 2] == "Version")
                {
                    bversion = parseFloat(testarray[i - 1]);
                }
            }
    
            BROWSER = "tableshrinker";
        }
    
        if((TABLEPROBLEMS == true)||(IMAGEPROBLEMS == true)||(NOINNERHTML == true)||(NOINDEXOF == true))
        {
            document.getElementById("browserwarn").style.position = "static";
            document.getElementById("browserwarn").style.visibility = "visible";
    
            bwarn.removeChild(bwarn.firstChild);
            bwarn.appendChild(document.createTextNode(bstring));
        }
    }
    
    function reset_gears_form()
    {
        //for (i=0; i<28; ++i)
        //{
           // if((arrMyGears[i] == null)||(arrMyGears[i] == 0))
           // {
           //     document.forms['mylathe'].elements[i].value = "";
           // }
            //else
           // {
           //     document.forms['mylathe'].elements[i].value = arrMyGears[i]+"";
           // }
       // }
    }
    
    function default_gears()
    {
        arrMyGears = document.getElementById("geartext").value.split(",");
        //var i, j;
        //var arrStrGears = strDefaultGears.split(",");
    
        //arrMyGears = [];
    
        //for (i=0, j=0;(arrStrGears[i]!=null)&&(i<28); ++i)
        //{
          //  if (arrStrGears[i] > 0)
          //  {
           //     arrMyGears[j] = parseInt(arrStrGears[i]);
          //      j++;
          //  }
       // }
    }
    
    function circle(x, y, z, s, file)
    {
        var size, strRet = "";
        if(typeof(s) == "number") size = Math.round(s + 0.5); else size = Math.round(parseInt(s) + 0.5);  
        z = Math.round(z);
        y = GEAR_PIC_Y + ILY - (y + (size/2));
        x = GPFVX + (x - (size/2));
        strRet = "<IMG style=\"opacity:0.8; position:absolute; z-index:" + z + "; top:" + y + "px; left:" + x + "px; width:" + size + "px; height:" + size + "px \" src=\"" + file + "\" >";
        return strRet;
    }
    
    function rectangle(x, y, z, s, file)
    {
        var size, strRet = "";
        if(typeof(s) == "number") size = s + 0.5; else size = parseInt(s) + 0.5;  
        z = Math.round(z);
        y = GEAR_PIC_Y + ILY - (y + (size/2));
        x = GEAR_PIC_X + x;
        strRet = "<IMG style=\"opacity:.8; position:absolute; z-index:" + z + "; top:" + y + "px; left:" + x + "px; width:20px; height:" + size + "px \" src=\"" + file + "\" >";
        return strRet;
    }
    
    function drawgears(a, b, c, d)
    {
        var strRet = "";
        var ra = a/2;
        var rb = b/2;
        var rc = c/2;
        var rd = d/2;
        var r1 = ra + rb;
        var r2;
        var bcentre = [0, 0];
    
        if(c > 0) // four gears
        {
            r2 = rd + rc;
            bcentre = intersection(0, ILY, r1, ILX, 0, r2);
            if((bcentre[0] != 0) && (bcentre[1] != 0))
            {
                strRet = circle(0, ILY, 1, a, redcircle);
                strRet += circle(bcentre[0], bcentre[1], 1, b, greencircle);
                strRet += circle(bcentre[0], bcentre[1], 3, c, cyancircle);
                strRet += circle(ILX, 0, 3, d, bluecircle);
          
                strRet += rectangle(20, ILY, 400, a, red);
                strRet += rectangle(20, bcentre[1], 400-bcentre[0], b, green);
                strRet += rectangle(0, bcentre[1], 400-bcentre[0], c, cyan );
                strRet += rectangle(0, 0, 400-ILX, d, blue);
            }
            strRet += "<img style=\"position:absolute; z-index:20; top:" + GEAR_PIC_Y + "px; left:" + (GEAR_PIC_X - 200) + "px; \" src=\"images\\fourgears.png\">";
        }
        else // three gears
        {
            r2 = rd + rb;
            bcentre = intersection(0, ILY, r1, ILX, 0, r2);
            if((bcentre[0] != 0) && (bcentre[1] != 0))
            {
                strRet = circle(0, ILY, 1, a, redcircle);
                strRet += circle(bcentre[0], bcentre[1], 1, b, greencircle);
                strRet += circle(ILX, 0, 1, d, bluecircle);
            
                strRet += rectangle(20, ILY, 400, a, red);
                strRet += rectangle(20, bcentre[1], 400-bcentre[0], b, green);
                strRet += rectangle(20, 0, 400-ILX, d, blue);
            }
            strRet += "<img style=\"position:absolute; z-index:20; top:" + GEAR_PIC_Y + "px; left:" + (GEAR_PIC_X - 200) + "px; \" src=\"images\\threegears.png\">";
        }
    
        return strRet;
    }
    
    function do_graphical_bit(arrGears)
    {
        var rpicPos = getPos(document.getElementById("rpic"));
        GEAR_PIC_X = rpicPos[0] + 300;
        GEAR_PIC_Y = rpicPos[1] + 60;
        if(BROWSER == "tableshrinker")
        {
            GEAR_PIC_X = GEAR_PIC_X - 100;
            GEAR_PIC_Y = GEAR_PIC_Y - 10;
        }
        GPFVX = GEAR_PIC_X + 80 + GEAR_PIC_FRONTVIEW_X;
    
        return (drawgears(arrGears[2], arrGears[3], arrGears[4], arrGears[5]));
    }
    
    // Note to self: tidy this up!
    function show_gears(strGears)
    {
        var arrGears = strGears.split(",");
        var ttpi, tmm, tp; 
        var tpi, mmp;
        var tpidiff, mmdiff, tpidiffpc;
        var tpiStr = "", mmpStr = "";
        var twarn = "";
        var tinfo = "";
        var tmpimp, tmpmetric, tmp;
        var strShortLong = "";
        var strMetricUnit = "mm";
        var strImperialUnit = '"';
    
        tp = document.getElementById("tgtpitch").value;
    
        if(document.getElementById("tpimm").value == "mm")
        {
            ttpi = 25.4 / tp;
            tmm = tp;
        }
        else
        {
            tmm = 25.4 / tp;
            ttpi = tp;
        }
    
        tpi = parseFloat(arrGears[0]);
        mmp = parseFloat(arrGears[1]);
        tpidiff = tpi - ttpi;
        mmdiff = mmp - tmm;
    
        if(ttpi > 0)
        {
            tpidiffpc = Math.round(1000000 * (tpidiff/ttpi)) / 10000; // percent tpi out, less than a ten thousandth of a percent considered close enough
        }
        else
        {
            tpidiffpc = 0;
        }
    
        if (Math.abs(tpidiffpc) > 0.0001)
        {
            if (tpidiffpc > 0)
            {
                tpiStr = " (+";
                strShortLong = "short of";
                mmpStr = " (";
            }
            else
            {
                tpiStr = " (";
                strShortLong = "past";
                mmpStr = " (+";
            }
            tpiStr += Math.round(10000 * tpidiffpc)/10000 + "%)";
    
            if (Math.abs(mmdiff) > 0.0000001) // this isn't very much out per thread, but it adds up. Well, OK, it's at least an order of magnitude too ridiculous.
            {
                mmpStr += Math.round(1e+7 * mmdiff)/1e+7 + "mm)";
                mmdiff = Math.abs(mmdiff);
                tmp = (0.025 / mmdiff) * mmp; // turns per thou times pitch
                tmpmetric = tmp;
                strMetricUnit = "mm";
                if (tmp > 10) 
                {
                    if (tmp > 250000)  // over quarter kilometer, give dist in kilometers, for laughs.
                    {
                        tmpmetric = tmp / 1000000;
                        strMetricUnit = "km";
                    }
                    else 
                    {
                        if (tmp > 1000)
                        {
                            tmpmetric = tmp / 1000; 
                            strMetricUnit = "m";
                        }
                        else
                        {
                            tmpmetric = tmp / 10;
                            strMetricUnit = "cm";
                        }
                    }
                }
    
                tmpimp = tmp / 25.4;
                strImperialUnit = '"';
                if (tmpimp > 12)
                {
                    if (tmpimp > 15840) // over quarter mile, give dist in miles, for laughs.
                    {
                        tmpimp /= 63360;
                        strImperialUnit = "miles";
                    }
                    else
                    {
                        if (tmpimp > 36)
                        {
                            tmpimp /= 36;
                            strImperialUnit = "yards";
                        }
                        else
                        {
                            tmpimp /= 12;
                            strImperialUnit = "ft";
                        }
                    }
                } 
    
                tinfo = "<div style=\"text-align:center; color:gray;\">"
                tinfo += "Thread will be 0.025mm (~ 0.001\") " + strShortLong + " its proper place ";
                tinfo += "after about " + Math.round(100 * tmpmetric)/100 + strMetricUnit + "(" + Math.round(100 * tmpimp)/100 + strImperialUnit + ")<br />";
    
                if(mmp > 0)
                {
                    tmp = Math.abs((10.0 / mmp) * mmdiff);
                    tinfo += "That\'s about " + Math.round(10000 * tmp)/10000 + "mm out after ";
                    tinfo += "1cm or " + Math.round(1000 * tmp)/10000 + "\" out after an inch<br />";
                }
                tinfo += "</div>";
            }
        }
        
        if(tpi > 0)
        {
            if ((16.0 / tpi) > 2)
            {
                twarn = "<div style=\"position:relative; left:3%; width:80% text-align:left; color:red;\"><br />";
                twarn += "WARNING: very coarse pitches will put a <strong>lot</strong> of strain on the leadscrew drive train.<br />"
                twarn += "This gearing involves about " + Math.round(1600.0/tpi) + "% more leadscrew torque than a 16tpi thread,<br />";
                twarn += "and " + Math.round(25600/tpi) + "% more than normal 20:80:20:80 power feed.<br /></div>";
            }
        }
       
        document.getElementById("extrainfo").innerHTML = tinfo + twarn;
    
        document.getElementById("rpitchtpi").innerHTML=Math.round(10000 * tpi)/10000 + " tpi" + tpiStr;
        document.getElementById("rpitchmm").innerHTML=Math.round(10000 * mmp)/10000 + " mm" + mmpStr;
        document.getElementById("rg1").innerHTML=arrGears[2];
        document.getElementById("rg2").innerHTML=arrGears[3];
        if(arrGears[4] > 0)
        {
            document.getElementById("rg3").innerHTML=arrGears[4];
        }
        else
        {
            document.getElementById("rg3").innerHTML="-";
        }
        document.getElementById("rg4").innerHTML=arrGears[5];
        document.getElementById("rpic").innerHTML=do_graphical_bit(arrGears);
    }
    
    function create_dropdown_entry(strGears, s)
    {
        var arrGears = strGears.split(",");
        var boldon=""; 
        var tp, pitch, diff, diffpc;
    
        pitch = parseFloat(arrGears[0]);
        diff = Math.abs(pitch - TGPITCH);
        if((TGPITCH > 0) && (pitch > 0))
        {
            diffpc = Math.round(1000000 * (diff/TGPITCH)) / 10000; // percent tpi out, less than a ten thousandth of a percent considered close enough
        }
    
        if(diffpc < 0.00001)
        {
            boldon = "style=\"font-weight:bold;\"";
        }
    
        strRet = "<option " + boldon;
        if(s == minDiffIdx)
        {
            strRet += "selected=\"selected\" ";
        }
        strRet += "value=\"" + strGears + "\">" + Math.round(10000 * arrGears[0])/10000 + "tpi / " + Math.round(100000 * arrGears[1])/100000 + "mm using A=";
    
        strRet += arrGears[2] + ", B=" + arrGears[3] + ", C=";
        if (arrGears[4] > 0)
        {
            strRet += arrGears[4];
        }
        else
        {
            strRet += "none";
        }
        strRet += ", D=" + arrGears[5] + "&nbsp;&nbsp;  (" + (1 + s) + " of " + numresults + ")</option>";
    
        return strRet;
    }
    
    function get_pitch(a, b, c, d)
    {
        var pitchtpi, pitchmm;
    
        if (c > 0)
        {
            pitchtpi = document.getElementById("leadscrew").value * (b / a) * (d / c);
        }
        else
        {
            pitchtpi = document.getElementById("leadscrew").value * (d / a);
        }
        pitchmm = 25.4 / pitchtpi;
        return "" + pitchtpi + "," + pitchmm + "," + a + "," + b + "," + c + "," + d;
    }
    
    // Following does not check minimum and maximum distances for centre spindle from A and D
    // spindles.
    function validate(gears)
    {
        var ag = gears.split(",");
        var strictervalid = true;
    
        if(document.getElementById("validateopt").checked == "allowover"  )
        {
            strictervalid = false;
        }
    
        var a = ag[2], b = ag[3], c = ag[4], d = ag[5];
    
        if(b == c) // pointless combinations
        {
            return false;
        }
    
        if(document.getElementById("validateopt").value == "novalidate"  )
        {
            return true;
        }
    
    
        if((a/2 + d/2) >= ILD)  // a and d gears overlap
        {
            return false;
        }
    
        if(c == 0)
        {
           if (( (a/2) + b + (d/2) ) < ILD) // combo of a, b and d gears not big enough to bridge gap
           {
                if(strictervalid)
                {
                    return false;
                }
           }
        }
        else
        {
            if( (b/2) > ((c/2) + (d/2) - 10)) // b is too big to fit behind d when concentric with c
            {
                if(strictervalid)
                {
                    return false;
                }
            }
    
            if(((a/2) + (b/2) + (c/2) + (d/2)) < ILD) // total length of geartrain insufficient
            {
                if(strictervalid)
                {
                    return false;
                }
            }
        }
        return true;
    }
    
    function add_result_line(gears, diff)
    {
        var j, arrTmp, tmp;
    
        if(numresults > 99) // remove worse entries if arbitrary limit of 100 reached
        {
            if(diff < maxDiff)
            {
                if (validate(gears))
                {
                    if(arrResults.indexOf(gears) == -1)
                    {
                        arrResults.splice(maxDiffIdx, 1);
                        numresults -= 1 ;
                        for(j = 0, maxDiff = 0; j < numresults; j++)
                        {
                            arrTmp = arrResults[j].split(",");
                            if(arrTmp[0] > maxDiff)
                            {
                                maxDiffIdx = j; 
                                maxDiff = arrTmp[0];
                            }
                        }
                    }
                }
            }
        }
    
        if(numresults < 100)
        {
            if(arrResults.indexOf(gears) < 0) // gears) == -1)
            {
                if (validate(gears))
                {
                    arrResults[numresults] = gears;
                    if(diff == minDiff) 
                    {
                        arrTmp = gears.split(",");
                        if(arrTmp[4] <= 0)
                        {
                            minDiffIdx = numresults;
                        }
                    }
                    if(diff < minDiff)
                    {
                        minDiff = diff;
                        minDiffIdx = numresults;
                    }
                    if(diff > maxDiff)
                    {
                        maxDiff = diff;
                        maxDiffIdx = numresults;
                    }
                    numresults++;
                }
            }
        }
    }
    
    function get_idler(i, j) // try to make idler gear 65 or near to it.
    {
        var idler = 65;
        var diff = 0;
        var mindiff = 100000;
        var q;
        for(q = 0; arrMyGears[q] != null; q++)
        {
            if((q != i) && (q != j))
            {
                diff = Math.abs(65 - arrMyGears[q]);
                if(diff < mindiff)
                {
                    mindiff = diff;
                    idler = arrMyGears[q];
                }
            }
        }
        return idler;
    }
    
    function permutate_and_filter(t)
    {
        var i = 0; j = 0; k = 0, m = 0;
        var idler = 0;
        var strLine = "";
        var arrLine = [];
        var tpi = 0;
        var ttpi = 0.0;
        var diff = 0.0;
    
        ttpi = document.getElementById("tgtpitch").value;
    
        if(document.getElementById("tpimm").value == "mm")
        {
            ttpi = 25.4 / ttpi;
        }
    
        // threshold is given as %age, we compare with fraction though, i.e. 1% is 0.01
        // Also, this forces thresh to be a number in case t is a string
        thresh = t/100;
    
        // instead of just skipping iterations for already used gears, this could cascade 
        // reduced gear sets or use some kind of cunning recursive structure, but this is
        // simple and probably more or less as quick.
        for(i = 0; arrMyGears[i] != null ; ++i)
        {
            for(j = 0; arrMyGears[j] != null; ++j)
            {
                if(i != j)
                {
                    idler = get_idler(i, j);
                    strLine = get_pitch(arrMyGears[i], idler, 0, arrMyGears[j]);
                    tpi = parseFloat(strLine);
                    diff = Math.abs(ttpi - tpi);
                    if(tpi > 0)
                    {
                        if((diff/tpi) < thresh)
                        {
                            add_result_line(strLine, diff);
                        }
                    }
                    for(k = 0; arrMyGears[k] != null; k++)
                    {
                        if((k != i) && (k != j))
                        {
                            for(m = 0; arrMyGears[m] != null; m++)
                            {
                                if((m != i)&&(m != j)&&(m != k))
                                {
                                    strLine = get_pitch(arrMyGears[i], arrMyGears[j], arrMyGears[k], arrMyGears[m]);
                                    tpi = parseFloat(strLine);
                                    diff = Math.abs(ttpi - tpi);
                                    if(tpi > 0)
                                    {
                                        if((diff/tpi) < thresh)
                                        {
                                            add_result_line(strLine, diff);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    function result_visibility(v)
    { 
        document.getElementById("resultrow").style.visibility=v;
        document.getElementById("resultrow2").style.visibility=v;
        document.getElementById("resultrow3").style.visibility=v;
        document.getElementById("resultrow4").style.visibility=v;
        document.getElementById("resultrow5").style.visibility=v;
    }
    
    function remove_results()
    {
        result_visibility("hidden");
        arrMyGears=[];
        arrResults=[];
        numresults=0;
        minDiffIdx=0;
        maxDiffIdx=0;
        minDiff=100000000;
        maxDiff=0;
        if(NOINDEXOF)
        {
            arrResults.indexOf = function(str) { var i; for(i = 0; this[i] != null; i++) { if(this[i] == str) return i; } return -1; }; 
        }
    }
    
    function sortbydiff(a, b)
    {
        var da = Math.abs(parseFloat(a) - TGPITCH);
        var db = Math.abs(parseFloat(b) - TGPITCH);
        return da - db;
    }
    
    function grind_core()
    {
        var strResultOptions = "";
        var i, tp;
        var pa = [];
        var thresh=0.2; // percent tpi
    
        // clean this up - nasty use of a global TGPITCH to simplify sorting etc.
        tp = document.getElementById("tgtpitch").value;
    
        if(document.getElementById("tpimm").value == "mm")
        {
            if(tp > 0)
            {
                tp = 25.4 / tp;
            }
        }
        TGPITCH = tp;
    
        while((numresults < 2) && (thresh < 5))
        {
            permutate_and_filter(thresh);
            thresh *= 2;
        }
    
        if (NOSORT == false)
        {
            arrResults.sort(sortbydiff);
            minDiffIdx = 0; // first item will be min diff if we sorted (see create_dropdown_entry)
        }
        
        for(i=0; arrResults[i] != null; i++)
        {
            strResultOptions += create_dropdown_entry(arrResults[i], i);
        }
       
        if(i > 0)
        { 
            document.getElementById("resultselector").innerHTML = strResultOptions;
            
            result_visibility("visible");
            
            document.getElementById("resultselector").onchange();
        }
        document.getElementById("grinding").style.visibility="hidden";
        reset_gears_form();
        return false;
    }
    
    function grind_my_gears()
    {
        remove_results();
        get_my_gears();
    
        if( parseFloat(document.getElementById("tgtpitch").value) > 0)
        {
            document.getElementById("grinding").style.visibility="visible";
            setTimeout("grind_core()", 0);
        }
        return false;
    }