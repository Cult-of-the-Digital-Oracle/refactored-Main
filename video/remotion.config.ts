import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// 1080p60-equivalent quality at h264; bump CRF lower for crisper VFX particles.
Config.setCrf(18);
