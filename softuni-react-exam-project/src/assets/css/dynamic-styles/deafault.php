<?php
	defined( '_JEXEC' ) or die( 'Restricted access' ); 

	include(JPATH_BASE."/templates/".$this->template."/functions/cssfunction.php");

	$defaultImage = "\"".JURI::base()."templates/".$this->template."/images/IMG_1688.jpg\"";
	
	if($this->params->get("TemplateBackgroundImageSource") == "CustomImage"):
		$CIsource = "\"".JURI::base().$this->params->get("CustomImageSource")."\""; 
	else:
		$CIsource = $defaultImage;
	endif;
	


	$updateCssParams = array();
	
	$CSSvalues = array("TemplateFontStyle"=>"Arial, Helvetica, sans-serif ","imageRepeatValue"=>"repeat","imageColourValue"=>"000","backgroundWidthSize"=>"100","backgroundHeightSize"=>"100","backgroundHWUnit"=>"%","backgrounAttachmentsValue"=>"fixed","marginValue"=>"0","paddingValue"=>"0","fontWeightValue"=>"100","colorValue"=>"0f0f0f","blMainContZIState"=>"335000","backgroundOpacity"=>"0.1","componentBackgroundColor"=>"221,221,221","footerBackground"=>" ","headerBackgroundImage"=>" ");
	if($this->params->get("TemplateStyle") == "Default"):
		$CSSvalues["websiteBackgroundColor"]="transparent";
		$CSSvalues["headerGradient"] = "";
	else:
		$marble =true;
	endif;
	
	foreach($CSSvalues as $key=>$cssv):
	
		if(!empty($this->params->get($key))):
			$CSSvalues[$key] = $this->params->get($key);
			if($key == "backgroundHWUnit" && $CSSvalues[$key] == "statement"): $CSSvalues["backgroundHeightSize"] =""; $CSSvalues[$key] = ""; endif;
			if($key == "componentBackgroundColor"):
				$hoverCompBackg = hex2RGB($CSSvalues[$key]);
				$CSSvalues[$key] = hex2RGB($CSSvalues[$key],true);
				$hoverCompBackg["red"] = $hoverCompBackg["red"] -5; $hoverCompBackg["green"] = $hoverCompBackg["green"] -5; $hoverCompBackg["blue"] = $hoverCompBackg["blue"] -5;
				$CSSvalues["hoverComponentBackgroundColor"] = implode(",",$hoverCompBackg);
				
			elseif($key == "websiteBackgroundColor" && $this->params->get("TemplateStyle") == "Default"):
				$cssv = str_replace("#","",$CSSvalues[$key]);
				$CSSvalues["topBorder"] = "background:url('".JURI::base()."templates/".$this->template."/images/dynamic-images/castlelike-singular-".$cssv.".png') repeat-x scroll top;".PHP_EOL."background-position:5px 0px; ".PHP_EOL."background-size:55px 17px;"; 
				
				$colour = $CSSvalues["websiteBackgroundColor"];
				$CSSvalues["headerGradient"] = "background:linear-gradient(to right, rgba(".$this->hex2dec($colour).",0.9), rgba(119, 119, 119,0.9), rgba(119, 119, 119,0.9), rgba(".$this->hex2dec($colour).",0.9));";
				
				if(file_exists(JPATH_ROOT."/templates/".$this->template."/images/dynamic-images/castlelike-singular-".$cssv.".png")):
					continue;	
				endif;
				require_once(JPATH_ROOT."/templates/".$this->template."/functions/rewrite.php");
				imageRewrite($cssv,array(60,17),array(30,17),array(0,0),JPATH_ROOT."/templates/".$this->template."/images/dynamic-images/castlelike-singular-".$cssv,"png",JPATH_ROOT."/templates/".$this->template."/images/castlelike-singular.png",JPATH_ROOT."/templates/".$this->template."/images/castlelike-singular.png",array(0,0),"png");
			endif;
			if($key == "footerBackground"):
				$CSSvalues[$key] == "1"? $CSSvalues[$key] = "background-image:url(\"".JURI::base()."templates/".$this->template."/images/styles/marble/th-wall.png\");": $CSSvalues[$key] =" ";
				
			endif;
			if($key == "headerBackgroundImage"):
				if(!empty($CSSvalues[$key]) && $CSSvalues[$key] != " ") $CSSvalues[$key] = "background-image:url('".JURI::base() . $CSSvalues[$key] ."');";
			endif;
		endif;
		
	endforeach;
	
	$CSSvalues["CustomImageSource"] = $CIsource;
	$updateTemplateCSS = ashtonCheckParams($CSSvalues,JPATH_BASE."/templates/".$this->template."/cache/css/",$cssFileName);
	$CSSvalues["joomlaRoot"] = JURI::base();
	if(isset($marble)):
		$CSSvalues["websiteBackgroundColor"]="transparent";
		$CSSvalues["topBorder"]="";
		$CSSvalues["headerGradient"] = "";
	endif;

	if(!$updateTemplateCSS)
	{
		//echo "Currently updates CSS... \n";
		if(!empty($this->params->get("cacheCSS")) && empty($this->debug)): $writeFile = true; else: $writeFile = false; endif;
		$asc = ashtonUpdateCSS(array_keys($CSSvalues),$CSSvalues,$writeFile,"templates/".$this->template."/css/dynamic-styles/sample.css.ini",JPATH_BASE."/templates/".$this->template."/cache/css/".$cssFileName);

		//echo "CSS updated! \n";
		if(!$asc):
			JFactory::getApplication()->enqueueMessage(JText::_('OBZOR_UPDATE_CSS'), 'notice');
		else:
			$document->addStyleDeclaration($asc);
		endif;
	}
	
	if(empty($asc))$document->addStyleSheet(JURI::base() . 'templates/' . $this->template . '/cache/css/'.$cssFileName/*, $type = 'text/css', $media = 'screen,projection'*/);
?>
