    // changegears.js - Javascript to calculate gear trains for lathes.
    // version 1.3.0
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
    // 2026-02-21: Fixed implicit global variables in permutate_and_filter() and create_dropdown_entry().
    //              Fixed validate() using .checked instead of .value on a <select> element.
    //              Restored integer parsing in get_my_gears() (documented optimisation was missing).
    //              Simplified default_gears() to call get_my_gears() instead of duplicating it.
    //              Replaced deprecated string-based setTimeout() call with a function reference.
    //              Added JSDoc comments to all functions. Updated file name in header.
    // 2020-03-10: Updated default gears function (greatly simplified), removed default gears as it's filled by default in the HTML file
    //              reflected in getElementById("geartext").value, updated get my gears function (simplified),
    //              entirely removed function reset_gears_form(), and check_browser(). maybe one day I can get this to be sub500 lines.
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
    var SETTINGS_KEY = "lathegears-settings";
    var DEFAULT_SETTINGS = {
        geartext: "20,20,30,35,40,40,45,50,55,57,60,65,80",
        leadscrew: "10",
        leadscrewtpimm: "tpi",
        tgtpitch: "20",
        tpimm: "tpi",
        validateopt: "validate"
    };
    var PITCH_VALUE_PRECISION = 1000000;
    
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

    /**
     * Reads the comma-separated gear list from the input field and populates
     * arrMyGears with integer tooth counts.  Storing integers (rather than the
     * strings produced by split()) avoids repeated type-coercion inside the
     * heavily-iterated search loops and measurably reduces execution time.
     */
    function get_my_gears()
    {
        var raw = document.getElementById("geartext").value.split(",");
        arrMyGears = raw.map(function(s) { return parseInt(s, 10); })
                        .filter(function(n) { return !isNaN(n) && n > 0; });
    }
    
    /**
     * Returns the cumulative [left, top] page offset of a DOM element in pixels.
     * @param {Element} e - The DOM element whose position is required.
     * @returns {number[]} Two-element array [left, top].
     */
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
    
    /**
     * Converts a numeric pitch value between TPI and mm.
     * @param {string|number} value - Current text-box value.
     * @param {string} fromUnit - "tpi" or "mm".
     * @param {string} toUnit - "tpi" or "mm".
     * @returns {string} Converted value rounded for display, or original value.
     */
    function convert_pitch_value(value, fromUnit, toUnit)
    {
        var numeric = parseFloat(value);
        if ((fromUnit === toUnit) || !(numeric > 0))
        {
            return value;
        }
        return "" + (Math.round((25.4 / numeric) * PITCH_VALUE_PRECISION) / PITCH_VALUE_PRECISION);
    }

    /**
     * Reads an input field and returns its value as TPI regardless of UI units.
     * @param {string} inputId - Text input element ID.
     * @param {string} unitId - Unit select element ID.
     * @returns {number} Pitch in TPI, or 0 for invalid/empty values.
     */
    function get_pitch_value_as_tpi(inputId, unitId)
    {
        var value = parseFloat(document.getElementById(inputId).value);
        if (!(value > 0))
        {
            return 0;
        }
        if (document.getElementById(unitId).value === "mm")
        {
            return 25.4 / value;
        }
        return value;
    }

    /**
     * Persists the current form settings in browser storage when available.
     */
    function save_settings()
    {
        var settings;
        try
        {
            if (!window.localStorage)
            {
                return;
            }
            settings = {
                geartext: document.getElementById("geartext").value,
                leadscrew: document.getElementById("leadscrew").value,
                leadscrewtpimm: document.getElementById("leadscrewtpimm").value,
                tgtpitch: document.getElementById("tgtpitch").value,
                tpimm: document.getElementById("tpimm").value,
                validateopt: document.getElementById("validateopt").value
            };
            window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        }
        catch(err)
        {
        }
    }

    /**
     * Applies a settings object to the form controls.
     * @param {Object} settings - Stored or default settings.
     */
    function apply_settings(settings)
    {
        document.getElementById("geartext").value = settings.geartext || DEFAULT_SETTINGS.geartext;
        document.getElementById("leadscrew").value = settings.leadscrew || DEFAULT_SETTINGS.leadscrew;
        document.getElementById("leadscrewtpimm").value = settings.leadscrewtpimm || DEFAULT_SETTINGS.leadscrewtpimm;
        document.getElementById("tgtpitch").value = settings.tgtpitch || DEFAULT_SETTINGS.tgtpitch;
        document.getElementById("tpimm").value = settings.tpimm || DEFAULT_SETTINGS.tpimm;
        document.getElementById("validateopt").value = settings.validateopt || DEFAULT_SETTINGS.validateopt;
    }

    /**
     * Restores persisted settings, falling back to the built-in defaults.
     */
    function restore_settings()
    {
        var settings = DEFAULT_SETTINGS;
        var stored;
        try
        {
            if (window.localStorage)
            {
                stored = window.localStorage.getItem(SETTINGS_KEY);
                if(stored)
                {
                    settings = JSON.parse(stored);
                }
            }
        }
        catch(err)
        {
            settings = DEFAULT_SETTINGS;
        }
        apply_settings(settings);
    }

    /**
     * Updates a pitch textbox when its unit selector changes.
     * @param {string} inputId - Text input element ID.
     * @param {string} unitId - Unit select element ID.
     */
    function update_unit_value(inputId, unitId)
    {
        var input = document.getElementById(inputId);
        var select = document.getElementById(unitId);
        var fromUnit = select.getAttribute("data-last-unit");
        if((fromUnit === null) || (typeof(fromUnit) === "undefined") || (fromUnit === ""))
        {
            fromUnit = select.value;
        }
        input.value = convert_pitch_value(input.value, fromUnit, select.value);
        select.setAttribute("data-last-unit", select.value);
        save_settings();
        remove_results();
    }

    /**
     * Resets the form to the built-in defaults.
     */
    function reset_defaults()
    {
        apply_settings(DEFAULT_SETTINGS);
        document.getElementById("tpimm").setAttribute("data-last-unit", document.getElementById("tpimm").value);
        document.getElementById("leadscrewtpimm").setAttribute("data-last-unit", document.getElementById("leadscrewtpimm").value);
        remove_results();
        get_my_gears();
        save_settings();
    }

    /**
     * Initialises saved state and default gear parsing on page load.
     */
    function initialize_form()
    {
        restore_settings();
        document.getElementById("tpimm").setAttribute("data-last-unit", document.getElementById("tpimm").value);
        document.getElementById("leadscrewtpimm").setAttribute("data-last-unit", document.getElementById("leadscrewtpimm").value);
        get_my_gears();
        save_settings();
    }

    /**
     * Updates the visible result count badge.
     */
    function update_result_count()
    {
        document.getElementById("resultcount").innerHTML = numresults;
    }

    /**
     * Converts the target pitch value between TPI and mm when the unit dropdown
     * changes.
     */
    function update_tpi()
    {
        update_unit_value("tgtpitch", "tpimm");
    }
    
    /**
     * Calculates an intersection point of two circles.  Used to determine the
     * position of the idler-gear centre for the on-screen diagram.
     * Returns the leftmost intersection point, or [0, 0] when the circles do
     * not intersect or are identical.
     * @param {number} x0 - X coordinate of the first circle's centre.
     * @param {number} y0 - Y coordinate of the first circle's centre.
     * @param {number} r0 - Radius of the first circle.
     * @param {number} x1 - X coordinate of the second circle's centre.
     * @param {number} y1 - Y coordinate of the second circle's centre.
     * @param {number} r1 - Radius of the second circle.
     * @returns {number[]} [x, y] of the intersection point, or [0, 0].
     */
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
    
    /**
     * Initialises arrMyGears from the HTML input field on page load.
     * Delegates to get_my_gears() so that the parsing logic is defined once.
     */
    function default_gears()
    {
        get_my_gears();
    }
    
    /**
     * Generates an HTML img tag representing a circular gear in the diagram.
     * @param {number} x    - X position relative to the gear picture origin.
     * @param {number} y    - Y position relative to the gear picture origin.
     * @param {number} z    - CSS z-index for stacking order.
     * @param {number|string} s - Diameter of the circle in pixels.
     * @param {string} file - Path to the image file.
     * @returns {string} HTML img tag string.
     */
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
    
    /**
     * Generates an HTML img tag representing a rectangular bar (shaft) in the
     * side-view portion of the diagram.
     * @param {number} x    - X position relative to the gear picture origin.
     * @param {number} y    - Y position relative to the gear picture origin.
     * @param {number} z    - CSS z-index for stacking order.
     * @param {number|string} s - Height of the rectangle in pixels.
     * @param {string} file - Path to the image file.
     * @returns {string} HTML img tag string.
     */
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
    
    /**
     * Builds the HTML for the gear-train diagram given four gear tooth counts.
     * When c is 0, a three-gear train is drawn; otherwise a four-gear train.
     * @param {number} a - Tooth count of the driver gear (A).
     * @param {number} b - Tooth count of the first driven/idler gear (B).
     * @param {number} c - Tooth count of the compound idler gear (C), or 0 for simple train.
     * @param {number} d - Tooth count of the leadscrew gear (D).
     * @returns {string} HTML string containing positioned img elements.
     */
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
    
    /**
     * Calculates the on-screen position of the result picture element and
     * delegates to drawgears() to produce the diagram HTML.
     * @param {string[]} arrGears - Parsed gear result array (tpi, mm, A, B, C, D).
     * @returns {string} HTML string for the gear diagram.
     */
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
    /**
     * Displays detailed information for a selected gear combination.
     * Updates the pitch cells, gear-label cells, error/warning text, and the
     * graphical gear diagram in the result section of the page.
     * @param {string} strGears - Comma-separated string: "tpi,mm,A,B,C,D".
     */
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
    
        ttpi = get_pitch_value_as_tpi("tgtpitch", "tpimm");
        if(ttpi > 0)
        {
            tmm = 25.4 / ttpi;
        }
        else
        {
            tmm = 0;
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
    
    /**
     * Creates an HTML option element string for the results dropdown.
     * The option is displayed in bold when the result pitch matches the target
     * exactly, and is pre-selected when it is the closest match.
     * @param {string} strGears - Comma-separated string: "tpi,mm,A,B,C,D".
     * @param {number} s        - Zero-based index of this result in arrResults.
     * @returns {string} HTML option element string.
     */
    function create_dropdown_entry(strGears, s)
    {
        var arrGears = strGears.split(",");
        var boldon=""; 
        var tp, pitch, diff, diffpc;
        var strRet;
    
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
    
    /**
     * Calculates the thread pitch produced by a gear combination and returns
     * it as a comma-separated string ready for storage in arrResults.
     * @param {number} a - Driver gear tooth count.
     * @param {number} b - First driven/idler gear tooth count.
     * @param {number} c - Compound idler gear tooth count, or 0 for simple train.
     * @param {number} d - Leadscrew gear tooth count.
     * @returns {string} "tpi,mm,a,b,c,d" result string.
     */
    function get_pitch(a, b, c, d)
    {
        var pitchtpi, pitchmm;
        var leadscrewtpi = get_pitch_value_as_tpi("leadscrew", "leadscrewtpimm");
    
        if (c > 0)
        {
            pitchtpi = leadscrewtpi * (b / a) * (d / c);
        }
        else
        {
            pitchtpi = leadscrewtpi * (d / a);
        }
        pitchmm = 25.4 / pitchtpi;
        return "" + pitchtpi + "," + pitchmm + "," + a + "," + b + "," + c + "," + d;
    }
    
    // Following does not check minimum and maximum distances for centre spindle from A and D
    // spindles.
    /**
     * Validates whether a gear combination is geometrically plausible.
     * Uses the ILX/ILY shaft-centre distances to check for overlapping or
     * under-reaching gear trains.  The strictness of the check is controlled
     * by the "validateopt" dropdown.
     * @param {string} gears - Comma-separated gear string: "tpi,mm,A,B,C,D".
     * @returns {boolean} true if the combination passes validation.
     */
    function validate(gears)
    {
        var ag = gears.split(",");
        var strictervalid = true;
    
        if(document.getElementById("validateopt").value == "allowover"  )
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
    
    /**
     * Adds a gear combination to arrResults if it passes validation and is not
     * already present.  Maintains a maximum of 100 results, replacing the
     * worst match when the limit is reached and the new entry is closer to the
     * target pitch.  Also tracks the indices of the best and worst matches.
     * @param {string} gears - Comma-separated gear string: "tpi,mm,A,B,C,D".
     * @param {number} diff  - Absolute difference between result TPI and target TPI.
     */
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
    
    /**
     * Selects the best idler gear for a simple (three-gear) train from the
     * available gear set, preferring a tooth count close to 65.
     * @param {number} i - Index of gear A in arrMyGears (excluded from selection).
     * @param {number} j - Index of gear D in arrMyGears (excluded from selection).
     * @returns {number} Tooth count of the chosen idler gear.
     */
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
    
    /**
     * Iterates through all permutations of arrMyGears and collects combinations
     * whose pitch falls within a given percentage threshold of the target.
     * Both simple (three-gear) and compound (four-gear) trains are considered.
     * @param {number} t - Acceptable error threshold in percent TPI.
     */
    function permutate_and_filter(t)
    {
        var i = 0, j = 0, k = 0, m = 0;
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
        var thresh = t/100;
    
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
    
    /**
     * Sets the CSS visibility of all result rows simultaneously.
     * @param {string} v - "visible" or "hidden".
     */
    function result_visibility(v)
    { 
        document.getElementById("resultrow").style.visibility=v;
        document.getElementById("resultrow2").style.visibility=v;
        document.getElementById("resultrow3").style.visibility=v;
        document.getElementById("resultrow4").style.visibility=v;
        document.getElementById("resultrow5").style.visibility=v;
    }
    
    /**
     * Hides all result rows and resets all global result-tracking variables.
     * Called whenever the user changes an input field or starts a new search.
     */
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
        update_result_count();
    }
    
    /**
     * Comparator for Array.sort() that orders gear result strings by how close
     * their TPI value is to the global target TGPITCH.
     * @param {string} a - First gear result string.
     * @param {string} b - Second gear result string.
     * @returns {number} Negative, zero, or positive for sort ordering.
     */
    function sortbydiff(a, b)
    {
        var da = Math.abs(parseFloat(a) - TGPITCH);
        var db = Math.abs(parseFloat(b) - TGPITCH);
        return da - db;
    }
    
    /**
     * Core search routine, called asynchronously by grind_my_gears() so that
     * the browser can render the "grinding gears..." indicator first.
     * Widens the search threshold until at least two results are found (up to
     * a 5% error), sorts the results, and populates the results dropdown.
     * @returns {boolean} Always returns false (prevents form submission).
     */
    function grind_core()
    {
        var strResultOptions = "";
        var i, tp;
        var pa = [];
        var thresh=0.2; // percent tpi
    
        // clean this up - nasty use of a global TGPITCH to simplify sorting etc.
        tp = get_pitch_value_as_tpi("tgtpitch", "tpimm");
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
        update_result_count();
        document.getElementById("grinding").style.visibility="hidden";
        return false;
    }
    
    /**
     * Entry point for a gear search, triggered by the "Search for combinations"
     * button.  Resets previous results, reads the current gear set, shows the
     * "grinding gears..." indicator, then schedules grind_core() asynchronously
     * so the indicator is visible before the search begins.
     * @returns {boolean} Always returns false (prevents form submission).
     */
    function grind_my_gears()
    {
        remove_results();
        get_my_gears();
        save_settings();
    
        if( parseFloat(document.getElementById("tgtpitch").value) > 0)
        {
            document.getElementById("grinding").style.visibility="visible";
            setTimeout(grind_core, 0);
        }
        return false;
    }
