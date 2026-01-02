{ pkgs, lib, config, inputs, ... }:

{
  packages = [
	 pkgs.git
	pkgs.bashInteractive	
	];

  languages = {
    javascript = {
      enable= true;
      npm = {
        enable =true;
      };
      bun = {
        enable = true;
      };
    };
  };

}
