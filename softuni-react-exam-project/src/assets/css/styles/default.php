<?php
defined( '_JEXEC' ) or die( 'Restricted access' ); 
if($this->params->get("TemplateStyle") == "marble"):
	
	$document->addStyleSheet(JURI::base() . 'templates/' . $this->template . '/css/styles/marble/template-marble.css', $type = 'text/css', $media = 'screen,projection'); //styles/marble/

	if($this->countModules("right") || $this->params->get("ForceRightColumn") == "yes"):

		$document->addStyleSheet(JURI::base() . 'templates/' . $this->template . '/css/styles/marble/sided.css', $type = 'text/css', $media = 'screen,projection');
	
	else:
	
		$document->addStyleSheet(JURI::base() . 'templates/' . $this->template . '/css/styles/marble/single.css', $type = 'text/css', $media = 'screen,projection');
	
	endif;
else:

	$document->addStyleSheet(JURI::base() . 'templates/' . $this->template . '/css/template.css', $type = 'text/css', $media = 'screen,projection');

endif;
?>