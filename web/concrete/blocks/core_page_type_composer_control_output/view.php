<?
	defined('C5_EXECUTE') or die("Access Denied.");
	$control = PageTypeComposerOutputControl::getByID($ptComposerOutputControlID);
	if (is_object($control)) {
		$fls = PageTypeComposerFormLayoutSetControl::getByID($control->getPageTypeComposerFormLayoutSetControlID());
		$cc = $fls->getPageTypeComposerControlObject();
		if (is_object($cc)) {
		?>
	<div class="ccm-ui">
		<div class="alert alert-info">
			<?=t('The %s page type composer form element will output its contents here (Block ID %s)', $cc->getPageTypeComposerControlName(), $b->getBlockID())?>
		</div>
	</div>
	<? } ?>
<? } ?>